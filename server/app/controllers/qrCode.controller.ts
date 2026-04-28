/**
 * qrCode.controller.ts
 *
 * HTTP layer for QR code endpoints.
 * All business logic delegated to qrCode.service.ts.
 * Errors forwarded to global errorHandler via next(error).
 */
import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError, NotFoundError } from "../errors/app.error.js";
import {
  getUserQrCodes,
  getQrCodeById,
  deleteQrCode,
  regenerateQrCode,
  getQrCodeByShortCode,
  createQrCodeFromExistingLink,
} from "../services/qrCode.service.js";

// ----------------------------------------------------------------
// POST /api/v1/qr-codes
// ----------------------------------------------------------------

export const createQrCodeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError();

    const qrCode = await createQrCodeFromExistingLink(req.body, userId);

    res.status(201).json({
      success: true,
      message: "QR code created successfully.",
      data: qrCode,
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------
// GET /api/v1/qr-codes
// ----------------------------------------------------------------

export const getUserQrCodesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError();

    const query = req.query as Record<string, string | undefined>;
    const limit = query.limit !== undefined ? Number(query.limit) : 50;

    const result = await getUserQrCodes(userId, {
      limit,
      ...(query.cursor ? { cursor: BigInt(query.cursor) } : {}),
      ...(query.search ? { search: query.search } : {}),
      ...(query.startDate ? { startDate: query.startDate } : {}),
      ...(query.endDate ? { endDate: query.endDate } : {}),
      ...(query.urlMappingId ? { urlMappingId: BigInt(query.urlMappingId) } : {}),
    });

    res.status(200).json({
      success: true,
      data: result.qrCodes,
      pagination: {
        limit,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------
// GET /api/v1/qr-codes/:id
// ----------------------------------------------------------------

export const getQrCodeByIdHandler = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError();

    const qrCode = await getQrCodeById(BigInt(req.params.id), userId);
    if (!qrCode) throw new NotFoundError("QR code not found.");

    res.status(200).json({ success: true, data: qrCode });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------
// DELETE /api/v1/qr-codes/:id
// ----------------------------------------------------------------

export const deleteQrCodeHandler = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError();

    await deleteQrCode(BigInt(req.params.id), userId);

    res.status(200).json({
      success: true,
      message: "QR code deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------
// PATCH /api/v1/qr-codes/:id/regenerate
// ----------------------------------------------------------------

export const regenerateQrCodeHandler = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError();

    const qrCode = await regenerateQrCode(BigInt(req.params.id), userId, req.body);

    res.status(200).json({
      success: true,
      message: "QR code regenerated successfully.",
      data: qrCode,
    });
  } catch (error) {
    next(error);
  }
};

// ----------------------------------------------------------------
// GET /api/v1/links/:shortCode/qr
// ----------------------------------------------------------------

export const getQrCodeByShortCodeHandler = async (
  req: Request<{ shortCode: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedError();

    const qrCode = await getQrCodeByShortCode(req.params.shortCode, userId);

    // Return null data gracefully when no QR exists for the link
    res.status(200).json({ success: true, data: qrCode });
  } catch (error) {
    next(error);
  }
};

