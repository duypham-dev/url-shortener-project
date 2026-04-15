import type { NextFunction, Request, Response } from "express";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/app.error.js";
import {
  createOrderId,
  createPaymentMetadata,
  createPendingPayment,
  extractAmountFromVnp,
  generateVnPayUrl,
  getPaymentByOrderId,
  processVnpayPayment,
  verifyVnPayReturn,
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

const parseClientIp = (req: Request): string => {
  const rawIpAddr =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

  const parsedIp = Array.isArray(rawIpAddr)
    ? rawIpAddr[0]
    : typeof rawIpAddr === "string"
      ? rawIpAddr.split(",")[0]
      : "127.0.0.1";

  if (!parsedIp || parsedIp === "::1") {
    return "127.0.0.1";
  }

  return parsedIp;
};

// POST /api/v1/create_payment_url
export const createPaymentUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const planId = Number(req.body.planId);
    if (!Number.isInteger(planId) || planId <= 0) {
      throw new BadRequestError("planId không hợp lệ");
    }

    const plan = await getSubscriptionPlanById(planId);
    if (!plan || !plan.is_active) {
      throw new NotFoundError("Không tìm thấy gói đăng ký đang hoạt động");
    }

    const amount = Number(plan.price);
    if (amount <= 0) {
      throw new BadRequestError("Gói đăng ký không hợp lệ");
    }

    const orderId = createOrderId(userId);
    const ipAddr = parseClientIp(req);
    const bankCode = req.body.bankCode as string | undefined;
    const locale = req.body.language as string | undefined;

    const { createDate, orderInfo } = createPaymentMetadata(plan.name, orderId);

    // Lưu thông tin đơn hàng vào DB trước khi redirect để đảm bảo có thể xử lý callback sau này.
    await createPendingPayment({
      orderId,
      userId,
      planId: plan.id,
      amount,
      currency: plan.currency,
      orderInfo,
      createDate,
    });

    // Tạo URL thanh toán VNPay
    const paymentUrl = generateVnPayUrl(
      amount,
      bankCode,
      locale,
      ipAddr,
      orderId,
      createDate,
      orderInfo,
    );

    return res.status(200).json({
      success: true,
      message: "Tạo link thanh toán thành công.",
      data: {
        paymentUrl,
        orderId,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/vnpay_return
export const vnpayReturn = async (req: Request, res: Response) => {
  const vnpParams = req.query as unknown as VnpParams;
  const orderId = String(vnpParams["vnp_TxnRef"] ?? "");

  if (!orderId) {
    return res.redirect(
      normalizeClientRedirect("unknown", "error", "01", "Missing order id"),
    );
  }

  if (!verifyVnPayReturn(vnpParams)) {
    return res.redirect(
      normalizeClientRedirect(orderId, "error", "97", "Invalid checksum"),
    );
  }

  try {
    // Return URL chỉ hiển thị kết quả cho người dùng.
    // Trạng thái DB chỉ được cập nhật bởi IPN callback.
    const payment = await getPaymentByOrderId(orderId);
    if (!payment) {
      return res.redirect(
        normalizeClientRedirect(orderId, "error", "01", "Order not found"),
      );
    }

    const vnpAmount = extractAmountFromVnp(vnpParams);
    const dbAmount = Math.round(Number(payment.amount) * 100);
    const callbackAmount = Math.round(vnpAmount * 100);
    if (dbAmount !== callbackAmount) {
      return res.redirect(
        normalizeClientRedirect(orderId, "error", "04", "Amount invalid"),
      );
    }

    const responseCode = String(vnpParams["vnp_ResponseCode"] ?? "99");
    const transactionStatus = String(vnpParams["vnp_TransactionStatus"] ?? "");
    const isGatewaySuccess =
      responseCode === "00" && (!transactionStatus || transactionStatus === "00");

    return res.redirect(
      normalizeClientRedirect(orderId, isGatewaySuccess ? "success" : "error", responseCode),
    );
  } catch (error) {
    console.error("vnpayReturn processing failed", error);
    return res.redirect(
      normalizeClientRedirect(orderId, "error", "99", "Unknown error"),
    );
  }
};

// GET /api/v1/vnpay_ipn
export const vnpayIpn = async (req: Request, res: Response) => {
  const vnpParams = req.query as unknown as VnpParams;

  try {
    if (!verifyVnPayReturn(vnpParams)) {
      return res.status(200).json({ RspCode: "97", Message: "Fail checksum" });
    }

    const orderId = String(vnpParams["vnp_TxnRef"] ?? "");
    if (!orderId) {
      return res.status(200).json({ RspCode: "01", Message: "Order not found" });
    }

    const vnpAmount = extractAmountFromVnp(vnpParams);
    const result = await processVnpayPayment(orderId, vnpAmount, vnpParams);

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
  } catch (error) {
    console.error("IPN verify failed", error);
    return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
};

// GET /api/v1/payments/:orderId
export const getPaymentResult = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orderId = String(req.params.orderId || "");
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    if (!orderId) {
      throw new BadRequestError("orderId is required");
    }

    const payment = await getPaymentByOrderId(orderId);
    if (!payment || payment.user_id !== userId) {
      throw new NotFoundError("Không tìm thấy giao dịch");
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
  } catch (error) {
    next(error);
  }
};
