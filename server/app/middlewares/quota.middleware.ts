import type { NextFunction, Request, Response } from "express";
import {
  assertCanCreateLink,
  type ActivePlanContext,
} from "../services/subscriptionAccess.service.js";

declare global {
  namespace Express {
    interface Request {
      activePlanContext?: ActivePlanContext;
    }
  }
}

const detectCustomLinkRequest = (req: Request): boolean => {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body) return false;

  return Boolean(body.isCustom || body.customCode || body.customAlias || body.alias);
};

export const enforceCreateLinkQuota = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
    return;
  }

  try {
    const activePlanContext = await assertCanCreateLink({
      userId,
      isCustom: detectCustomLinkRequest(req),
    });

    req.activePlanContext = activePlanContext;
    next();
  } catch (error) {
    next(error);
  }
};
