/**
 * analytics.controller.ts
 *
 * Handles GET /api/v1/links/:shortCode/analytics?groupBy=...
 * - Requires authentication (verifyToken)
 * - Verifies link ownership (skipped for top_links)
 * - Checks active subscription (analytics is a paid feature)
 * - Dispatches to the correct service function based on `groupBy`
 */
import type { NextFunction, Request, Response } from "express";
import {
  ForbiddenError,
  NotFoundError,
} from "../errors/app.error.js";
import {
  isLinkOwnedByUser,
  getTimeseriesAnalytics,
  getReferrersAnalytics,
  getCountriesAnalytics,
  getDevicesAnalytics,
  getTopLinksAnalytics,
  getClickLogs,
} from "../services/analytics.service.js";
import { getActivePlanContext } from "../services/subscriptionAccess.service.js";
import type { AnalyticsGroupBy, TimeseriesMode } from "../types/analytics.type.js";

export const getGroupedLinkAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.userId;
    const shortCode = req.params.shortCode as string;

    // Query params are already validated and defaulted by Zod
    const { groupBy, start, end, timezone, mode } = req.query as unknown as {
      groupBy: AnalyticsGroupBy;
      start: string;
      end: string;
      timezone: string;
      mode: TimeseriesMode;
    };

    if (!userId) {
      throw new ForbiddenError("Unauthorized");
    }

    // 1. Verify link ownership — skip for top_links (user-level, not link-level)
    if (groupBy !== "top_links") {
      const isOwner = await isLinkOwnedByUser(shortCode, userId);
      if (!isOwner) {
        throw new NotFoundError("Link không tồn tại hoặc không thuộc về bạn.");
      }
    }

    // 2. Check subscription — analytics is a paid feature
    const context = await getActivePlanContext(userId);

    if (!context.plan.allow_analytics) {
      return res.status(403).json({
        success: false,
        code: "PLAN_REQUIRED",
        message:
          "Tính năng phân tích chỉ dành cho tài khoản trả phí. Vui lòng nâng cấp gói.",
      });
    }

    // 3. Dispatch to the correct service function
    let items: unknown;

    switch (groupBy) {
      case "timeseries":
        items = await getTimeseriesAnalytics(shortCode, start, end, timezone, mode);
        break;
      case "referrers":
        items = await getReferrersAnalytics(shortCode, start, end);
        break;
      case "countries":
        items = await getCountriesAnalytics(shortCode, start, end);
        break;
      case "devices":
        items = await getDevicesAnalytics(shortCode, start, end);
        break;
      case "top_links":
        items = await getTopLinksAnalytics(userId, start, end);
        break;
    }

    return res.status(200).json({
      success: true,
      data: { groupBy, items },
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
