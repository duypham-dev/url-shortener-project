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

/**
 * Cancel the user's active subscription immediately.
 * Server returns 404 if no active subscription exists.
 */
export const cancelMySubscription = async (): Promise<void> => {
  await axiosClient.post("/subscriptions/me/cancel");
};
