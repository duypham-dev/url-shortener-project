import {
  getActiveSubscriptionPlans as getActiveSubscriptionPlansRepo,
  getSubscriptionPlanById as getSubscriptionPlanByIdRepo,
  cancelActiveSubscriptionRepo,
} from "../repositories/subscription.repo";
import { NotFoundError } from "../errors/app.error.js";

export const getActiveSubscriptionPlans = async () => {
  return getActiveSubscriptionPlansRepo();
};

export const getSubscriptionPlanById = async (planId: number) => {
  return getSubscriptionPlanByIdRepo(planId);
};

/**
 * Cancel the user's active subscription immediately.
 * Throws NotFoundError if no active subscription exists.
 */
export const cancelActiveSubscription = async (userId: number) => {
  const result = await cancelActiveSubscriptionRepo(userId);

  if (result.count === 0) {
    throw new NotFoundError(
      "Không tìm thấy gói cước đang hoạt động để hủy.",
    );
  }

  return { cancelled: true };
};