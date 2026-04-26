/**
 * payment.controller.ts
 *
 * Handles VNPay payment flow:
 * - POST /create_payment_url — creates a pending payment + redirects to VNPay
 * - GET /vnpay_return — handles VNPay redirect back to frontend
 * - GET /vnpay_ipn — handles VNPay server-to-server callback
 * - GET /payments/:orderId — fetches payment result for display
 */
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
  getPaymentForVerification,
  getPaymentForDisplay,
  processVnpayPayment,
  verifyVnPayReturn,
} from "../services/payment.service.js";
import { getSubscriptionPlanById } from "../services/subscription.service.js";
import { assertNoActiveSubscription } from "../services/subscriptionAccess.service.js";
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
// Body has been validated by validate(createPaymentUrlSchema) middleware:
//   planId: number (integer, positive)
//   bankCode?: string
//   language?: string
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

    // planId has been validated by the middleware — guaranteed to be a positive integer
    const planId = req.body.planId as number;

    const plan = await getSubscriptionPlanById(planId);
    if (!plan || !plan.is_active) {
      throw new NotFoundError("Invalid subscription plan");
    }

    const amount = Number(plan.price);
    if (amount <= 0) {
      throw new BadRequestError("Invalid subscription plan");
    }

    // Guard: prevent duplicate subscriptions (throws ConflictError)
    await assertNoActiveSubscription(userId);

    const orderId = createOrderId(userId);
    const ipAddr = parseClientIp(req);
    const bankCode = req.body.bankCode as string | undefined;
    const locale = req.body.language as string | undefined;

    const { createDate, orderInfo } = createPaymentMetadata(plan.name, orderId);

    // Save pending payment to DB before redirecting to payment gateway
    // (also re-checks active subscription + pending payment inside transaction)
    await createPendingPayment({
      orderId,
      userId,
      planId: plan.id,
      amount,
      currency: plan.currency,
      orderInfo,
      createDate,
    });

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
    // Return URL only displays the result — DB state is updated by IPN.
    const payment = await getPaymentForVerification(orderId);
    if (!payment) {
      return res.redirect(
        normalizeClientRedirect(orderId, "error", "01", "Order not found"),
      );
    }

    const vnpAmount = extractAmountFromVnp(vnpParams);
    const dbAmount = Number(payment.amount);
    if (Math.round(dbAmount * 100) !== Math.round(vnpAmount * 100)) {
      return res.redirect(
        normalizeClientRedirect(orderId, "error", "04", "Amount invalid"),
      );
    }

    const responseCode = String(vnpParams["vnp_ResponseCode"] ?? "99");
    const transactionStatus = String(vnpParams["vnp_TransactionStatus"] ?? "");
    const isSuccess =
      responseCode === "00" &&
      (!transactionStatus || transactionStatus === "00");

    return res.redirect(
      normalizeClientRedirect(
        orderId,
        isSuccess ? "success" : "error",
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

// GET /api/v1/vnpay_ipn
export const vnpayIpn = async (req: Request, res: Response) => {
  const vnpParams = req.query as unknown as VnpParams;

  try {
    if (!verifyVnPayReturn(vnpParams)) {
      return res.status(200).json({ RspCode: "97", Message: "Fail checksum" });
    }

    const orderId = String(vnpParams["vnp_TxnRef"] ?? "");
    if (!orderId) {
      return res
        .status(200)
        .json({ RspCode: "01", Message: "Order not found" });
    }

    const vnpAmount = extractAmountFromVnp(vnpParams);
    const result = await processVnpayPayment(orderId, vnpAmount, vnpParams);

    if (result.outcome === "not_found") {
      return res
        .status(200)
        .json({ RspCode: "01", Message: "Order not found" });
    }

    if (result.outcome === "amount_mismatch") {
      return res
        .status(200)
        .json({ RspCode: "04", Message: "Amount invalid" });
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
// Param orderId has been validated by validate(paymentOrderIdSchema) middleware
export const getPaymentResult = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orderId = req.params.orderId as string;
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    const payment = await getPaymentForDisplay(orderId);
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