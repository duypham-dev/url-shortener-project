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
  getLinkReferrerAnalytics,
  getLinkBreakdownAnalytics,
  getClickLogs,
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
    const [analytics, referrerAnalytics, breakdownAnalytics] = await Promise.all([
      getDailyClickAnalytics(shortCode, 30),
      getLinkReferrerAnalytics(shortCode),
      getLinkBreakdownAnalytics(shortCode),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...analytics,
        referrers: referrerAnalytics,
        ...breakdownAnalytics,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getLinkClickLogs = async (
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

    // Verify ownership
    const isOwner = await isLinkOwnedByUser(shortCode, userId);
    if (!isOwner) {
      throw new NotFoundError("Link not found or does not belong to you.");
    }

    // Check subscription — analytics is a paid feature
    const context = await getActivePlanContext(userId);
    if (!context.plan.allow_analytics) {
      return res.status(403).json({
        success: false,
        code: "PLAN_REQUIRED",
        message: "Analytics feature is only available for paid accounts. Please upgrade your plan.",
      });
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(500, Math.max(1, Number(req.query.pageSize ?? 50)));

    const { rows, total } = await getClickLogs(shortCode, page, pageSize);

    return res.status(200).json({
      success: true,
      data: {
        shortCode,
        page,
        pageSize,
        total,
        rows,
      },
    });
  } catch (error) {
    next(error);
  }
};
