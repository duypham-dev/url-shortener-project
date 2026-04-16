/**
 * analytics.controller.ts
 *
 * Handles GET /api/v1/links/:shortCode/analytics
 * - Requires authentication (verifyToken)
 * - Verifies link ownership
 * - Checks active subscription (analytics is a paid feature)
 * - Returns daily click data for the last 30 days
 */
import type { NextFunction, Request, Response } from "express";
import {
  ForbiddenError,
  NotFoundError,
} from "../errors/app.error.js";
import {
  isLinkOwnedByUser,
  getDailyClickAnalytics,
} from "../services/analytics.service.js";
import { getActivePlanContext } from "../services/subscriptionAccess.service.js";

export const getLinkAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    const shortCode = req.params.shortCode as string;

    if (!userId) {
      throw new ForbiddenError("Unauthorized");
    }

    if (!shortCode) {
      throw new NotFoundError("Short code is required.");
    }

    // 1. Verify link ownership
    const isOwner = await isLinkOwnedByUser(shortCode, userId);
    if (!isOwner) {
      throw new NotFoundError("Link không tồn tại hoặc không thuộc về bạn.");
    }

    // 2. Check subscription — analytics is a paid feature
    const context = await getActivePlanContext(userId);
    if (!context.plan.allow_analytics) {
      return res.status(403).json({
        success: false,
        code: "PLAN_REQUIRED",
        message: "Tính năng phân tích chỉ dành cho tài khoản trả phí. Vui lòng nâng cấp gói.",
      });
    }

    // 3. Get analytics data
    const analytics = await getDailyClickAnalytics(shortCode, 30);

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};
