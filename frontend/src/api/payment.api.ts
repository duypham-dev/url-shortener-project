import { axiosClient } from "../config/axiosClient";

export interface PaymentUrlResponse {
  success?: boolean;
  message?: string;
  paymentUrl?: string;
  orderId?: string;
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
  planId: number | null = null,
  planName: string,
  bankCode: string | null = null,
): Promise<PaymentUrlResponse> => {
  const response = await axiosClient.post("/create_payment_url", {
    planId,
    planName,
    bankCode,
  });
  return (response.data || response) as PaymentUrlResponse;
};

export const getPaymentResult = async (
  orderId: string,
): Promise<PaymentResultResponse> => {
  const response = await axiosClient.get(`/payments/${orderId}`);
  return (response.data || response) as PaymentResultResponse;
};
