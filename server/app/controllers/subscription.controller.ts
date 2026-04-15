import type { NextFunction, Request, Response } from "express";
import {
  BadRequestError,
  UnauthorizedError,
} from "../errors/app.error.js";
import { getActivePlanContext } from "../services/subscriptionAccess.service.js";
import { getActiveSubscriptionPlans } from "../services/subscription.service.js";

export const getSubscriptionPlans = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const plans = await getActiveSubscriptionPlans();
    return res.status(200).json(
      plans.map((plan) => ({
        ...plan,
        price: Number(plan.price),
      })),
    );
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

    const context = await getActivePlanContext(userId);

    return res.status(200).json({
      success: true,
      data: {
        plan: context.plan,
        subscription: context.subscription,
        usage: context.usage,
        hasPendingPayment: context.hasPendingPayment,
        isVip: context.plan.tier !== "free",
      },
    });
  } catch (error) {
    next(error);
  }
};
