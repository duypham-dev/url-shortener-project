import { axiosClient } from "../config/axiosClient";
import type {
  ActivePlanAccess,
  SubscriptionPlan,
} from "../types/subscription.type";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  return axiosClient.get("/subscriptions/plans");
};

export const getMyPlanAccess = async (): Promise<ActivePlanAccess> => {
  const response = (await axiosClient.get(
    "/subscriptions/me/plan",
  )) as ApiEnvelope<ActivePlanAccess>;

  return response.data;
};
