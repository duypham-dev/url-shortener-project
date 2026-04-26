/**
 * qrQuota.middleware.ts
 *
 * Enforces QR code creation quota before the controller runs.
 * Mirrors enforceCreateLinkQuota exactly, calling assertCanCreateQrCode instead.
 */
import type { NextFunction, Request, Response } from "express";
import {
  assertCanCreateQrCode,
} from "../services/subscriptionAccess.service.js";

export const enforceCreateQrQuota = async (
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
    const activePlanContext = await assertCanCreateQrCode(userId);
    req.activePlanContext = activePlanContext;
    next();
  } catch (error) {
    next(error);
  }
};
