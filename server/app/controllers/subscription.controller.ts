import type { NextFunction, Request, Response } from "express";
import {
  BadRequestError,
  UnauthorizedError,
} from "../errors/app.error.js";
import { getFullPlanContext } from "../services/subscriptionAccess.service.js";
import {
  getActiveSubscriptionPlans,
  cancelActiveSubscription,
} from "../services/subscription.service.js";

export const getSubscriptionPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plans = await getActiveSubscriptionPlans();
    return res.status(200).json({
      success: true,
      data: plans.map((plan) => ({
        ...plan,
        price: Number(plan.price),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPlanAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestError("userId không hợp lệ");
    }

    // Full context includes pending payment flag (only needed by this API)
    const context = await getFullPlanContext(userId);

    return res.status(200).json({
      success: true,
      data: {
        plan: context.plan,
        subscription: context.subscription,
        usage: context.usage,
        hasPendingPayment: context.hasPendingPayment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /subscriptions/me/cancel
 * Cancels the user's active subscription immediately.
 * Returns 404 if no active subscription exists.
 */
export const cancelMySubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError("Unauthorized");
    }

    await cancelActiveSubscription(userId);

    return res.status(200).json({
      success: true,
      message: "Gói cước đã được hủy thành công.",
    });
  } catch (error) {
    next(error);
  }
};
