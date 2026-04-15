import config from "config";
import qs from "qs";
import crypto from "crypto";
import moment from "moment";
import { prisma } from "../libs/prisma.js";
import { PaymentStatus } from "../../generated/prisma/enums";

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

export interface CreatePaymentRecordInput {
  orderId: string;
  userId: number;
  planId: number;
  amount: number;
}


// Hàm tạo URL thanh toán VNPay
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
  let vnp_Params: VnpParams = {};

  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  vnp_Params["vnp_Locale"] = lang;
  vnp_Params["vnp_CurrCode"] = currCode;
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = orderInfo;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = Math.round(amount * 100);
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;

  if (bankCode) {
    vnp_Params["vnp_BankCode"] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  vnp_Params["vnp_SecureHash"] = signed;
  vnpUrl += "?" + qs.stringify(vnp_Params, { encode: false });

  return vnpUrl;
};

// Hàm xác thực dữ liệu trả về từ VNPay
export const verifyVnPayReturn = (rawParams: VnpParams): boolean => {
  const vnp_Params: VnpParams = { ...rawParams };
  const secureHash = vnp_Params["vnp_SecureHash"]?.toString() ?? "";

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  const sortedParams = sortObject(vnp_Params);

  const secretKey = config.get("vnp_HashSecret") as string;
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return secureHash === signed;
};

export const generatePaymentRecord = async (
  input: CreatePaymentRecordInput,
): Promise<{ subscriptionId: string }> => {
  const { orderId, userId, planId, amount } = input;

  return prisma.$transaction(async (tx) => {
    const newSub = await tx.subscriptions.create({
      data: {
        user_id: userId,
        plan_id: planId,
        status: "pending",
        expires_at: new Date(),
      },
    });

    await tx.payments.create({
      data: {
        id: orderId,
        user_id: userId,
        subscription_id: newSub.id,
        amount,
        provider: "VNPay",
        status: "pending",
      },
    });

    return { subscriptionId: newSub.id };
  });
};

export const getPaymentByOrderId = async (orderId: string) => {
  return prisma.payments.findUnique({
    where: { id: orderId },
    include: {
      subscriptions: {
        include: {
          subscription_plans: true,
        },
      },
    },
  });
};

export const processVnpayPayment = async (
  orderId: string,
  vnpAmount: number,
  vnp_Params: VnpParams,
): Promise<ProcessPaymentResult> => {
  const payment = await getPaymentByOrderId(orderId);
  if (!payment) {
    return { outcome: "not_found" };
  }

  const dbAmount = Number(payment.amount);
  if (dbAmount !== vnpAmount) {
    return { outcome: "amount_mismatch", paymentStatus: payment.status };
  }

  if (payment.status !== "pending") {
    return { outcome: "already_processed", paymentStatus: payment.status };
  }

  const responseCode = String(vnp_Params["vnp_ResponseCode"] ?? "");
  const transactionStatus = String(vnp_Params["vnp_TransactionStatus"] ?? "");
  const isSuccess = responseCode === "00" && (!transactionStatus || transactionStatus === "00");

  if (isSuccess) {
    const durationDays = payment.subscriptions?.subscription_plans?.duration_days ?? 30;
    await handleSuccessfulPayment(
      payment.id,
      payment.user_id,
      payment.subscription_id,
      durationDays,
      vnp_Params,
    );
    return { outcome: "success", paymentStatus: "completed" };
  }

  await handleFailedPayment(payment.id, payment.subscription_id, vnp_Params);
  return { outcome: "failed", paymentStatus: "failed" };
};

const handleSuccessfulPayment = async (
  orderId: string,
  userId: number,
  subscriptionId: string | null,
  durationDays: number,
  vnp_Params: VnpParams,
) => {
  const date = new Date();

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { is_vip: true, vip_expires_at: true },
  });

  let newVipExpiresAt = moment(date).add(durationDays, "days").toDate();
  if (user?.is_vip && user.vip_expires_at && moment(user.vip_expires_at).isAfter(date)) {
    newVipExpiresAt = moment(user.vip_expires_at).add(durationDays, "days").toDate();
  }

  await prisma.$transaction(async (tx) => {
    await tx.payments.update({
      where: { id: orderId },
      data: {
        status: "completed",
        provider_tx_id: vnp_Params["vnp_TransactionNo"]?.toString() ?? null,
        paid_at: date,
        provider_payload: vnp_Params,
      },
    });

    if (subscriptionId) {
      await tx.subscriptions.update({
        where: { id: subscriptionId },
        data: {
          status: "active",
          started_at: date,
          expires_at: newVipExpiresAt,
        },
      });
    }

    await tx.users.update({
      where: { id: userId },
      data: {
        is_vip: true,
        vip_expires_at: newVipExpiresAt,
      },
    });
  });
};

const handleFailedPayment = async (
  orderId: string,
  subscriptionId: string | null,
  vnp_Params: VnpParams,
) => {
  await prisma.$transaction(async (tx) => {
    await tx.payments.update({
      where: { id: orderId },
      data: {
        status: "failed",
        provider_tx_id: vnp_Params["vnp_TransactionNo"]?.toString() ?? null,
        provider_payload: vnp_Params,
      },
    });

    if (subscriptionId) {
      await tx.subscriptions.update({
        where: { id: subscriptionId },
        data: {
          status: "cancelled",
        },
      });
    }
  });
};

// Hàm sắp xếp object theo key (dùng để tạo chuỗi ký)
export const sortObject = (obj: VnpParams): { [key: string]: string } => {
  const global: { [key: string]: string } = {};
  const str: string[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (let key = 0; key < str.length; key++) {
    const strKey = decodeURIComponent(str[key] || '');
    const value = obj[strKey];
    if (value !== undefined && value !== null && value !== "") {
      global[strKey] = encodeURIComponent(String(value)).replace(/%20/g, "+");
    }
  }
  return global;
};
