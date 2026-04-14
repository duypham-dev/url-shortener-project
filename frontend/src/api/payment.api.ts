import { axiosClient } from "../config/axiosClient";

export interface PaymentUrlResponse {
  paymentUrl?: string;
  [key: string]: any;
}

export const createPaymentUrl = async (amount: number, bankCode: string | null = null, planId: string | null = null): Promise<PaymentUrlResponse> => {
  const response = await axiosClient.post("/create_payment_url", {
    amount,
    bankCode,
    planId,
  });
  return (response.data || response) as PaymentUrlResponse;
};
