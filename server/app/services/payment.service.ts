/**
 * payment.service.ts
 *
 * Handles VNPay payment lifecycle: URL generation, signature verification,
 * pending payment creation, and IPN processing.
 *
 * Key business rules enforced:
 * - One subscription per user: createPendingPayment checks for existing
 *   active subscriptions inside the transaction (race-condition safe).
 * - No time-stacking: activateSubscriptionAfterSuccess sets expiry to
 *   now + duration_days, never stacking on top of existing subscriptions.
 * - Idempotent IPN: uses updateMany with status = pending guard.
 */
import config from "config";
import crypto from "crypto";
import qs from "qs";
import { PaymentStatus } from "../../generated/prisma/enums";
import { prisma } from "../libs/prisma";
import { ConflictError } from "../errors/app.error.js";

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

// ----------------------------------------------------------------
// Date / amount helpers
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// Order / metadata generation
// ----------------------------------------------------------------

export const createOrderId = (userId: number): string => {
  const randomHex = crypto.randomBytes(4).toString("hex");
  return `VNP_${Date.now()}_${userId}_${randomHex}`;
};

export const createPaymentMetadata = (planName: string, orderId: string, date = new Date()) => {
  // Strip Vietnamese diacritics and special characters to prevent VNPay checksum failures
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

// ----------------------------------------------------------------
// VNPay URL generation & verification
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// Pending payment creation (with duplicate subscription guard)
// ----------------------------------------------------------------

const PENDING_PAYMENT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const createPendingPayment = async (
  input: CreatePendingPaymentInput,
): Promise<{ subscriptionId: string }> => {
  const { orderId, userId, planId, amount, currency, orderInfo, createDate } = input;

  return prisma.$transaction(async (tx) => {
    // Guard: prevent duplicate active subscriptions (race-condition safe inside tx)
    const existingActive = await tx.subscriptions.findFirst({
      where: {
        user_id: userId,
        status: "active",
        expires_at: { gt: new Date() },
      },
      select: { id: true },
    });

    if (existingActive) {
      throw new ConflictError(
        "Bạn đang có gói cước đang hoạt động. Vui lòng hủy gói hiện tại trước khi đăng ký gói mới.",
      );
    }

    // Guard: prevent multiple pending payments within TTL
    const pendingCutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_MS);
    const existingPending = await tx.payments.findFirst({
      where: {
        user_id: userId,
        status: "pending",
        created_at: { gte: pendingCutoff },
      },
      select: { id: true },
    });

    if (existingPending) {
      throw new ConflictError(
        "Bạn đang có giao dịch chờ xử lý. Vui lòng hoàn tất hoặc chờ giao dịch hết hạn trước khi tạo giao dịch mới.",
      );
    }

    const pendingSubscription = await tx.subscriptions.create({
      data: {
        user_id: userId,
        plan_id: planId,
        status: "pending",
        started_at: new Date(),
        expires_at: new Date(), // placeholder — set to real value on activation
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
// Purpose-specific payment queries
// ----------------------------------------------------------------

/**
 * Minimal query for signature/amount verification (vnpay_return flow).
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

// ----------------------------------------------------------------
// IPN processing — activate or fail payment
// ----------------------------------------------------------------

/**
 * Activate subscription after successful payment.
 * No time-stacking: always sets expiry to now + duration_days.
 */
const activateSubscriptionAfterSuccess = async (
  orderId: string,
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
      // Simple activation: now + duration_days (no stacking)
      await tx.subscriptions.update({
        where: {
          id: subscriptionId,
        },
        data: {
          status: "active",
          started_at: now,
          expires_at: addDays(now, durationDays),
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
      payment.subscription_id,
      durationDays,
      vnpParams,
    );

    // Re-fetch to confirm activation (handles race conditions)
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

// ----------------------------------------------------------------
// Utility
// ----------------------------------------------------------------

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
