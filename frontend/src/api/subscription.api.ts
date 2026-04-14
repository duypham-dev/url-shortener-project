import { axiosClient } from "../config/axiosClient";
import type { SubscriptionPlan } from "../types/subscription.type";


export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await axiosClient.get("/subscriptions/plans");
  return response.data || response;
};
