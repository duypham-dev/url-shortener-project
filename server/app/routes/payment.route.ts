import { Router } from "express";
import {
  createPaymentUrl,
  vnpayReturn,
  vnpayIpn,
  getPaymentResult,
} from "../controllers/payment.controller.js";
import { verifyToken } from "../middlewares/verifyToken.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createPaymentUrlSchema,
  paymentOrderIdSchema,
} from "../schemas/payment.schema.js";

const paymentRouter = Router();

paymentRouter.post(
  "/create_payment_url",
  verifyToken,
  validate(createPaymentUrlSchema),
  createPaymentUrl,
);

// VNPay callbacks — query params will be validated in controller since VNPay may send extra params we don't define in schema
paymentRouter.get("/vnpay_return", vnpayReturn);
paymentRouter.get("/vnpay_ipn", vnpayIpn);

paymentRouter.get(
  "/payments/:orderId",
  verifyToken,
  validate(paymentOrderIdSchema),
  getPaymentResult,
);

export default paymentRouter;