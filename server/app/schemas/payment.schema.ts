import { z } from "zod";
 
/**
 * Validate body của POST /create_payment_url
 * planId phải là số nguyên dương.
 * bankCode và language là tuỳ chọn (VNPay optional params).
 */
export const createPaymentUrlSchema = z.object({
  body: z.object({
    planId: z.coerce
      .number()
      .int("planId must be an integer")
      .positive("planId must be a positive number"),
    bankCode: z.string().max(20).optional(),
    language: z.string().max(10).optional(),
  }),
});
 
/**
 * Validate param :orderId của GET /payments/:orderId
 */
export const paymentOrderIdSchema = z.object({
  params: z.object({
    orderId: z
      .string()
      .min(1, "orderId must not be empty")
      .max(255, "orderId is too long"),
  }),
});