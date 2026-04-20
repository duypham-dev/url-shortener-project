/**
 * payment.service.ts
 *
 * Refactor Notes:
 * - Phase 3: Split monolithic getPaymentByOrderId (which used nested `include`
 *   fetching ALL columns from payments + subscriptions + subscription_plans)
 *   into three purpose-specific query functions:
 *     • getPaymentForVerification — minimal fields for signature/amount checks
 *     • getPaymentForProcessing — adds subscription + plan duration for IPN flow
 *     • getPaymentForDisplay — shaped fields for the API response
 *   Each fetches only what its caller needs, avoiding large JSONB payloads
 *   and unnecessary JOINs.
 */
import config from "config";
import crypto from "crypto";
import qs from "qs";
import { PaymentStatus } from "../../generated/prisma/enums";
import { prisma } from "../libs/prisma";

export interface VnpParams {
  [key: string]: string | number | undefined;
}

export type ProcessPaymentOutcome =
  | "success"
  | "failed"
  | "already_processed"
  | "not_found"
  | "amount_mismatch";

export interface ProcessPaymentResult {
  outcome: ProcessPaymentOutcome;
  paymentStatus?: PaymentStatus;
}

export interface CreatePendingPaymentInput {
  orderId: string;
  userId: number;
  planId: number;
  amount: number;
  currency: string;
  orderInfo: string;
  createDate: string;
}

const toVnpDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}${second}`;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const normalizeAmount = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const isAmountMatched = (dbAmount: number, vnpAmount: number): boolean => {
  return normalizeAmount(dbAmount) === normalizeAmount(vnpAmount);
};

const isGatewaySuccess = (vnpParams: VnpParams): boolean => {
  const responseCode = String(vnpParams["vnp_ResponseCode"] ?? "");
  const transactionStatus = String(vnpParams["vnp_TransactionStatus"] ?? "");
  return responseCode === "00" && (!transactionStatus || transactionStatus === "00");
};

export const createOrderId = (userId: number): string => {
  const randomHex = crypto.randomBytes(4).toString("hex");
  return `VNP_${Date.now()}_${userId}_${randomHex}`;
};

export const createPaymentMetadata = (planName: string, orderId: string, date = new Date()) => {
  // Lược bỏ dấu tiếng Việt và ký tự đặc biệt (chỉ giữ chữ/số) để tránh lỗi Fail Checksum của VNPay
  const safePlanName = planName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    createDate: toVnpDate(date),
    orderInfo: `Thanh toan ${safePlanName} - ${orderId}`,
  };
};

export const generateVnPayUrl = (
  amount: number,
  bankCode: string | undefined,
  locale: string | undefined,
  ipAddr: string,
  orderId: string,
  createDate: string,
  orderInfo: string,
): string => {
  const tmnCode = config.get("vnp_TmnCode") as string;
  const secretKey = config.get("vnp_HashSecret") as string;
  let vnpUrl = config.get("vnp_Url") as string;
  const returnUrl = config.get("vnp_ReturnUrl") as string;

  const lang = !locale || locale === "" ? "vn" : locale;
  const currCode = "VND";
  let vnpParams: VnpParams = {};

  vnpParams["vnp_Version"] = "2.1.0";
  vnpParams["vnp_Command"] = "pay";
  vnpParams["vnp_TmnCode"] = tmnCode;
  vnpParams["vnp_Locale"] = lang;
  vnpParams["vnp_CurrCode"] = currCode;
  vnpParams["vnp_TxnRef"] = orderId;
  vnpParams["vnp_OrderInfo"] = orderInfo;
  vnpParams["vnp_OrderType"] = "other";
  vnpParams["vnp_Amount"] = Math.round(amount * 100);
  vnpParams["vnp_ReturnUrl"] = returnUrl;
  vnpParams["vnp_IpAddr"] = ipAddr;
  vnpParams["vnp_CreateDate"] = createDate;

  if (bankCode) {
    vnpParams["vnp_BankCode"] = bankCode;
  }

  vnpParams = sortObject(vnpParams);

  const signData = qs.stringify(vnpParams, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  vnpParams["vnp_SecureHash"] = signed;
  vnpUrl += `?${qs.stringify(vnpParams, { encode: false })}`;

  return vnpUrl;
};

export const verifyVnPayReturn = (rawParams: VnpParams): boolean => {
  const vnpParams: VnpParams = { ...rawParams };
  const secureHash = vnpParams["vnp_SecureHash"]?.toString() ?? "";

  delete vnpParams["vnp_SecureHash"];
  delete vnpParams["vnp_SecureHashType"];

  const sortedParams = sortObject(vnpParams);

  const secretKey = config.get("vnp_HashSecret") as string;
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return secureHash === signed;
};

export const extractAmountFromVnp = (params: VnpParams): number => {
  const raw = params["vnp_Amount"];
  const amount = raw ? Number(raw) / 100 : 0;
  return Number.isFinite(amount) ? amount : 0;
};

export const createPendingPayment = async (
  input: CreatePendingPaymentInput,
): Promise<{ subscriptionId: string }> => {
  const { orderId, userId, planId, amount, currency, orderInfo, createDate } = input;

  return prisma.$transaction(async (tx) => {
    const pendingSubscription = await tx.subscriptions.create({
      data: {
        user_id: userId,
        plan_id: planId,
        status: "pending",
        started_at: new Date(),
        expires_at: new Date(),
      },
    });

    await tx.payments.create({
      data: {
        id: orderId,
        user_id: userId,
        subscription_id: pendingSubscription.id,
        amount,
        currency,
        provider: "VNPay",
        status: "pending",
        provider_payload: {
          vnp_OrderInfo: orderInfo,
          vnp_CreateDate: createDate,
        },
      },
    });

    return { subscriptionId: pendingSubscription.id };
  });
};

// ----------------------------------------------------------------
// Purpose-specific payment queries (replaces monolithic getPaymentByOrderId)
// ----------------------------------------------------------------

/**
 * Minimal query for signature/amount verification (vnpay_return flow).
 * Only fetches the fields needed to validate the payment.
 */
export const getPaymentForVerification = async (orderId: string) => {
  return prisma.payments.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      amount: true,
      status: true,
      user_id: true,
    },
  });
};

/**
 * Query for IPN processing — includes subscription + plan duration.
 * Avoids fetching large provider_payload JSONB.
 */
export const getPaymentForProcessing = async (orderId: string) => {
  return prisma.payments.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      amount: true,
      status: true,
      user_id: true,
      subscription_id: true,
      subscriptions: {
        select: {
          subscription_plans: {
            select: {
              duration_days: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Query for the payment result API response — includes display-friendly fields.
 */
export const getPaymentForDisplay = async (orderId: string) => {
  return prisma.payments.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      user_id: true,
      paid_at: true,
      provider_payload: true,
      subscriptions: {
        select: {
          subscription_plans: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
};

const activateSubscriptionAfterSuccess = async (
  orderId: string,
  userId: number,
  subscriptionId: string | null,
  durationDays: number,
  vnpParams: VnpParams,
) => {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const paymentUpdateCount = await tx.payments.updateMany({
      where: {
        id: orderId,
        status: "pending",
      },
      data: {
        status: "completed",
        provider_tx_id: vnpParams["vnp_TransactionNo"]?.toString() ?? null,
        paid_at: now,
        provider_payload: vnpParams,
      },
    });

    // Idempotency guard: another process might have already confirmed this order.
    if (paymentUpdateCount.count === 0) {
      return;
    }

    if (subscriptionId) {
      const latestActiveSubscription = await tx.subscriptions.findFirst({
        where: {
          user_id: userId,
          status: "active",
          expires_at: {
            gt: now,
          },
          id: {
            not: subscriptionId,
          },
        },
        orderBy: {
          expires_at: "desc",
        },
        select: {
          expires_at: true,
        },
      });

      const baseDate =
        latestActiveSubscription?.expires_at && latestActiveSubscription.expires_at > now
          ? latestActiveSubscription.expires_at
          : now;

      await tx.subscriptions.update({
        where: {
          id: subscriptionId,
        },
        data: {
          status: "active",
          started_at: now,
          expires_at: addDays(baseDate, durationDays),
        },
      });
    }
  });
};

const markPaymentAsFailed = async (
  orderId: string,
  subscriptionId: string | null,
  vnpParams: VnpParams,
) => {
  await prisma.$transaction(async (tx) => {
    const paymentUpdateCount = await tx.payments.updateMany({
      where: {
        id: orderId,
        status: "pending",
      },
      data: {
        status: "failed",
        provider_tx_id: vnpParams["vnp_TransactionNo"]?.toString() ?? null,
        provider_payload: vnpParams,
      },
    });

    if (paymentUpdateCount.count === 0) {
      return;
    }

    if (subscriptionId) {
      await tx.subscriptions.updateMany({
        where: {
          id: subscriptionId,
          status: "pending",
        },
        data: {
          status: "cancelled",
        },
      });
    }
  });
};

export const processVnpayPayment = async (
  orderId: string,
  vnpAmount: number,
  vnpParams: VnpParams,
): Promise<ProcessPaymentResult> => {
  const payment = await getPaymentForProcessing(orderId);
  if (!payment) {
    return { outcome: "not_found" };
  }

  const dbAmount = Number(payment.amount);
  if (!isAmountMatched(dbAmount, vnpAmount)) {
    return { outcome: "amount_mismatch", paymentStatus: payment.status };
  }

  if (payment.status !== "pending") {
    return { outcome: "already_processed", paymentStatus: payment.status };
  }

  if (isGatewaySuccess(vnpParams)) {
    const durationDays = payment.subscriptions?.subscription_plans?.duration_days ?? 30;
    await activateSubscriptionAfterSuccess(
      payment.id,
      payment.user_id,
      payment.subscription_id,
      durationDays,
      vnpParams,
    );

    const latestPayment = await prisma.payments.findUnique({
      where: { id: payment.id },
      select: { status: true },
    });

    if (latestPayment?.status !== "completed") {
      return latestPayment?.status
        ? { outcome: "already_processed", paymentStatus: latestPayment.status }
        : { outcome: "already_processed" };
    }

    return { outcome: "success", paymentStatus: "completed" };
  }

  await markPaymentAsFailed(payment.id, payment.subscription_id, vnpParams);

  const latestPayment = await prisma.payments.findUnique({
    where: { id: payment.id },
    select: { status: true },
  });

  if (latestPayment?.status !== "failed") {
    return latestPayment?.status
      ? { outcome: "already_processed", paymentStatus: latestPayment.status }
      : { outcome: "already_processed" };
  }

  return { outcome: "failed", paymentStatus: "failed" };
};

// Hàm sắp xếp object theo key (dùng để tạo chuỗi ký)
export const sortObject = (obj: VnpParams): { [key: string]: string } => {
  const sorted: { [key: string]: string } = {};
  const keys: string[] = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(encodeURIComponent(key));
    }
  }

  keys.sort();

  for (let index = 0; index < keys.length; index += 1) {
    const decodedKey = decodeURIComponent(keys[index] || "");
    const value = obj[decodedKey];

    if (value !== undefined && value !== null && value !== "") {
      sorted[decodedKey] = encodeURIComponent(String(value)).replace(/%20/g, "+");
    }
  }

  return sorted;
};
