/**
 * qrCode.route.ts
 *
 * All QR code endpoints.
 * Mount order matters: specific paths before parameterized ones.
 */
import express from "express";
import { verifyToken } from "../middlewares/verifyToken.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { enforceCreateQrQuota } from "../middlewares/qrQuota.middleware.js";
import {
  createQrCodeSchema,
  getQrCodesQuerySchema,
  qrCodeIdSchema,
  updateQrCodeSchema,
} from "../schemas/qrCode.schema.js";
import {
  createQrCodeHandler,
  getUserQrCodesHandler,
  getQrCodeByIdHandler,
  deleteQrCodeHandler,
  regenerateQrCodeHandler,
  getQrCodeByShortCodeHandler,
} from "../controllers/qrCode.controller.js";
import { shortCodeSchema } from "../schemas/shortCode.schema.js";

const router = express.Router();

// GET  /api/v1/links/:shortCode/qr — get QR linked to a specific short link
router.get(
  "/links/:shortCode/qr",
  verifyToken,
  validate(shortCodeSchema),
  getQrCodeByShortCodeHandler,
);

// POST /api/v1/qr-codes — create QR code for an existing short link
router.post(
  "/qr-codes",
  verifyToken,
  validate(createQrCodeSchema),
  createQrCodeHandler,
);

// GET /api/v1/qr-codes — list user's QR codes
router.get(
  "/qr-codes",
  verifyToken,
  validate(getQrCodesQuerySchema),
  getUserQrCodesHandler,
);

// GET /api/v1/qr-codes/:id — get single QR code
router.get(
  "/qr-codes/:id",
  verifyToken,
  validate(qrCodeIdSchema),
  getQrCodeByIdHandler,
);

// DELETE /api/v1/qr-codes/:id — soft delete
router.delete(
  "/qr-codes/:id",
  verifyToken,
  validate(qrCodeIdSchema),
  deleteQrCodeHandler,
);

// PATCH /api/v1/qr-codes/:id/regenerate — update style + re-upload
router.patch(
  "/qr-codes/:id/regenerate",
  verifyToken,
  validate(updateQrCodeSchema),
  regenerateQrCodeHandler,
);

export default router;
