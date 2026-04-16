import { axiosClient } from "../config/axiosClient";
import type { ApiEnvelope } from "../types/api.type";

export interface CreatePaymentUrlData {
  paymentUrl: string;
  orderId: string;
}

export interface PaymentResultResponse {
  orderId: string;
  amount: number;
  currency: string;
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  status: "success" | "error" | "pending";
  orderInfo: string | null;
  planName: string | null;
  paidAt: string | null;
}

export const createPaymentUrl = async (
  planId: number,
  bankCode: string | null = null,
): Promise<CreatePaymentUrlData> => {
  const response = (await axiosClient.post(
    "/create_payment_url",
    {
      planId,
      bankCode,
    },
  )) as ApiEnvelope<CreatePaymentUrlData>;

  return response.data;
};

export const getPaymentResult = async (
  orderId: string,
): Promise<PaymentResultResponse> => {
  const response = (await axiosClient.get(
    `/payments/${orderId}`,
  )) as ApiEnvelope<PaymentResultResponse>;

  return response.data;
};
