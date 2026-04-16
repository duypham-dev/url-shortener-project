import { axiosClient } from "../config/axiosClient";
import type { ApiEnvelope } from "../types/api.type";
import type {
  ActivePlanAccess,
  SubscriptionPlan,
} from "../types/subscription.type";

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = (await axiosClient.get(
    "/subscriptions/plans",
  )) as ApiEnvelope<SubscriptionPlan[]>;

  return response.data;
};

export const getMyPlanAccess = async (): Promise<ActivePlanAccess> => {
  const response = (await axiosClient.get(
    "/subscriptions/me/plan",
  )) as ApiEnvelope<ActivePlanAccess>;

  return response.data;
};
