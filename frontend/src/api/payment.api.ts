import { axiosClient } from "../config/axiosClient";

export interface PaymentUrlResponse {
  paymentUrl?: string;
}

export const createPaymentUrl = async (planId: number | null = null, amount: number, bankCode: string | null = null): Promise<PaymentUrlResponse> => {
  const response = await axiosClient.post("/create_payment_url", {
    planId,
    amount,
    bankCode,
  });
  return (response.data || response) as PaymentUrlResponse;
};
