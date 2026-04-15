import type { Request, Response } from "express";
import moment from "moment";
import crypto from "crypto";
import {
  generateVnPayUrl,
  verifyVnPayReturn,
  generatePaymentRecord,
  getPaymentByOrderId,
  processVnpayPayment,
} from "../services/payment.service.js";
import { getSubscriptionPlanById } from "../services/subscription.service.js";
import type { VnpParams } from "../services/payment.service.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const normalizeClientRedirect = (
  orderId: string,
  status: "success" | "error",
  code: string,
  message?: string,
) => {
  const params = new URLSearchParams({ orderId, status, code });
  if (message) {
    params.set("message", message);
  }
  return `${FRONTEND_URL}/payment-success?${params.toString()}`;
};

const extractAmountFromVnp = (params: VnpParams): number => {
  const raw = params["vnp_Amount"];
  const amount = raw ? Number(raw) / 100 : 0;
  return Number.isFinite(amount) ? amount : 0;
};


const createOrderId = (userId: number): string => {
  const randomHex = crypto.randomBytes(4).toString("hex");
  return `VNP_${Date.now()}_${userId}_${randomHex}`;
};

const parseClientIp = (req: Request): string => {
  const rawIpAddr =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

  let ipAddr = Array.isArray(rawIpAddr)
    ? rawIpAddr[0]
    : typeof rawIpAddr === "string"
      ? rawIpAddr.split(",")[0]
      : "127.0.0.1";

  if (!ipAddr) {
    ipAddr = "127.0.0.1";
  }

  if (ipAddr === "::1") ipAddr = "127.0.0.1";
  return ipAddr;
};

// Tạo URL thanh toán VNPay
export const createPaymentUrl = async (req: Request, res: Response) => {
  process.env.TZ = "Asia/Ho_Chi_Minh";

  const userId = req.user?.userId; // Đã được verifyToken middleware gắn vào req
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const planId = req.body.planId;
  if (!planId) {
    return res.status(400).json({ message: "planId is required" });
  }

  const planIdNumber = Number(planId);
  if (!Number.isInteger(planIdNumber) || planIdNumber <= 0) {
    return res.status(400).json({ message: "planId không hợp lệ" });
  }

  const plan = await getSubscriptionPlanById(planIdNumber);
  if (!plan || !plan.is_active) {
    return res.status(404).json({ message: "Không tìm thấy gói đăng ký đang hoạt động" });
  }

  const amount = Number(plan.price);
  if (amount <= 0) {
    return res.status(400).json({ message: "Gói đăng ký không hợp lệ" });
  }

  const bankCode = req.body.bankCode;
  const locale = req.body.language;
  const orderId = createOrderId(userId);
  const ipAddr = parseClientIp(req);

  // Khai báo date để đảm bảo tính nhất quán giữa URL trả về VNPay và dữ liệu lưu vào DB
  const date = new Date();
  const createDate = moment(date).format("YYYYMMDDHHmmss");
  const orderInfo = `Thanh toan ${plan.name} - ${orderId}`;

  try {
    // 1. LƯU DATABASE TRƯỚC (QUAN TRỌNG)
    await generatePaymentRecord({
      orderId,
      userId,
      planId: plan.id,
      amount,
    });

    // 2. CHỈ KHI LƯU DB THÀNH CÔNG MỚI TẠO URL VNPAY
    const paymentUrl = generateVnPayUrl(
      amount,
      bankCode,
      locale,
      ipAddr,
      orderId,
      createDate,
      orderInfo,
    );

    // 3. TRẢ VỀ URL CHO FRONTEND
    res.status(200).json({
      success: true,
      message: "Tạo link thanh toán thành công.",
      paymentUrl,
      orderId,
    });
  } catch (error) {
    console.error("Lỗi khi tạo giao dịch hoặc tạo URL VNPay:", error);
    // Trả về lỗi 500 nếu DB lỗi hoặc hàm generateVnPayUrl lỗi
    res.status(500).json({ message: "Lỗi hệ thống, không thể tạo giao dịch lúc này" });
  }
};

export const vnpayReturn = async (req: Request, res: Response) => {
  const vnp_Params = req.query as unknown as VnpParams;
  const orderId = String(vnp_Params["vnp_TxnRef"] ?? "");

  if (!orderId) {
    return res.redirect(
      normalizeClientRedirect("unknown", "error", "01", "Missing order id"),
    );
  }

  const isValid = verifyVnPayReturn(vnp_Params);
  if (!isValid) {
    return res.redirect(
      normalizeClientRedirect(orderId, "error", "97", "Invalid checksum"),
    );
  }

  try {
    // Return URL only validates checksum and displays result to customer.
    // Transaction state updates are handled by IPN callback.
    const payment = await getPaymentByOrderId(orderId);
    if (!payment) {
      return res.redirect(
        normalizeClientRedirect(orderId, "error", "01", "Order not found"),
      );
    }

    const vnpAmount = extractAmountFromVnp(vnp_Params);
    if (Number(payment.amount) !== vnpAmount) {
      return res.redirect(
        normalizeClientRedirect(orderId, "error", "04", "Amount invalid"),
      );
    }

    const responseCode = String(vnp_Params["vnp_ResponseCode"] ?? "99");
    const transactionStatus = String(vnp_Params["vnp_TransactionStatus"] ?? "");
    const isGatewaySuccess =
      responseCode === "00" && (!transactionStatus || transactionStatus === "00");

    return res.redirect(
      normalizeClientRedirect(
        orderId,
        isGatewaySuccess ? "success" : "error",
        responseCode,
      ),
    );
  } catch (error) {
    console.error("vnpayReturn processing failed", error);
    return res.redirect(
      normalizeClientRedirect(orderId, "error", "99", "Unknown error"),
    );
  }
};

export const vnpayIpn = async (req: Request, res: Response) => {
  const vnp_Params = req.query as unknown as VnpParams;

  // Try-catch chống lỗi IPN nếu params nil
  try {
    const isValid = verifyVnPayReturn(vnp_Params);

    if (!isValid) {
      return res.status(200).json({ RspCode: "97", Message: "Fail checksum" });
    }

    const orderId = String(vnp_Params["vnp_TxnRef"] ?? "");
    if (!orderId) {
      return res.status(200).json({ RspCode: "01", Message: "Order not found" });
    }

    const vnpAmount = extractAmountFromVnp(vnp_Params);
    const result = await processVnpayPayment(orderId, vnpAmount, vnp_Params);

    if (result.outcome === "not_found") {
      return res.status(200).json({ RspCode: "01", Message: "Order not found" });
    }

    if (result.outcome === "amount_mismatch") {
      return res.status(200).json({ RspCode: "04", Message: "Amount invalid" });
    }

    if (result.outcome === "already_processed") {
      return res
        .status(200)
        .json({ RspCode: "02", Message: "Order already confirmed" });
    }

    return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
  } catch (err) {
    console.error("IPN verify failed", err);
    return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
};

export const getPaymentResult = async (req: Request, res: Response) => {
  const orderId = String(req.params.orderId || "");
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!orderId) {
    return res.status(400).json({ success: false, message: "orderId is required" });
  }

  const payment = await getPaymentByOrderId(orderId);
  if (!payment || payment.user_id !== userId) {
    return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch" });
  }

  const payloadObject =
    payment.provider_payload && typeof payment.provider_payload === "object"
      ? (payment.provider_payload as Record<string, unknown>)
      : null;

  const orderInfo =
    payloadObject && typeof payloadObject.vnp_OrderInfo === "string"
      ? payloadObject.vnp_OrderInfo
      : null;

  return res.status(200).json({
    success: true,
    data: {
      orderId: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentStatus: payment.status,
      status:
        payment.status === "completed"
          ? "success"
          : payment.status === "pending"
            ? "pending"
            : "error",
      orderInfo,
      planName: payment.subscriptions?.subscription_plans?.name || null,
      paidAt: payment.paid_at,
    },
  });
};
