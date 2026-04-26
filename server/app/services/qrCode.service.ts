/**
 * qrCode.service.ts
 *
 * Business logic for QR code lifecycle:
 *   create → list → get → delete → regenerate
 *
 * Cloudinary upload is attempted; on failure the record is still saved
 * with cloudinary_url = null so the frontend falls back to <QRCodeSVG>.
 */
import QRCode from "qrcode";
import { logger } from "../utils/logger.js";
import {
  assertCanCreateQrCode,
} from "./subscriptionAccess.service.js";
import {
  uploadQrCodeToCloudinary,
  deleteQrCodeFromCloudinary,
} from "./cloudinary.service.js";
import {
  createQrCodeRepo,
  getUserQrCodesRepo,
  getQrCodeByIdRepo,
  getQrCodeByShortCodeRepo,
  softDeleteQrCodeRepo,
  updateQrCodeRepo,
  setUrlMappingHasQrRepo,
  incrementQrCodeUsageRepo,
  type GetUserQrCodesOptions,
} from "../repositories/qrCode.repo.js";
import { NotFoundError } from "../errors/app.error.js";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface QrGenerationOptions {
  destinationUrl: string;
  fgColor: string;
  bgColor: string;
  errorCorrection: "L" | "M" | "Q" | "H";
  size: number;
}

export interface CreateQrCodeInput {
  destinationUrl: string;
  urlMappingId?: string | null;  // BigInt stringified from frontend
  title?: string | null;
  fgColor?: string;
  bgColor?: string;
  errorCorrection?: "L" | "M" | "Q" | "H";
  size?: number;
}

export interface QrCodeSummary {
  id: string;
  userId: number;
  urlMappingId: string | null;
  destinationUrl: string;
  shortCode: string | null;
  title: string | null;
  cloudinaryUrl: string | null;
  fgColor: string;
  bgColor: string;
  errorCorrection: string;
  size: number;
  scanCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface GetUserQrCodesResult {
  qrCodes: QrCodeSummary[];
  hasNextPage: boolean;
  nextCursor: string | null;
}

// ----------------------------------------------------------------
// Helper: serialize a DB row to the API summary shape
// ----------------------------------------------------------------

const serializeQrCode = (row: {
  id: bigint;
  user_id: number;
  url_mapping_id: bigint | null;
  destination_url: string;
  short_code: string | null;
  title: string | null;
  cloudinary_url: string | null;
  fg_color: string;
  bg_color: string;
  error_correction: string;
  size: number;
  scan_count: number;
  is_active: boolean;
  created_at: Date | null;
}): QrCodeSummary => ({
  id: row.id.toString(),
  userId: row.user_id,
  urlMappingId: row.url_mapping_id?.toString() ?? null,
  destinationUrl: row.destination_url,
  shortCode: row.short_code,
  title: row.title,
  cloudinaryUrl: row.cloudinary_url,
  fgColor: row.fg_color,
  bgColor: row.bg_color,
  errorCorrection: row.error_correction,
  size: row.size,
  scanCount: row.scan_count,
  isActive: row.is_active,
  createdAt: row.created_at?.toISOString() ?? new Date().toISOString(),
});

// ----------------------------------------------------------------
// QR PNG generation (server-side)
// ----------------------------------------------------------------

export const generateQrCodeDataUrl = async (
  options: QrGenerationOptions,
): Promise<string> => {
  return QRCode.toDataURL(options.destinationUrl, {
    width: options.size,
    color: {
      dark: options.fgColor,
      light: options.bgColor,
    },
    errorCorrectionLevel: options.errorCorrection,
    type: "image/png",
    margin: 1,
  });
};

// ----------------------------------------------------------------
// Helper: current year-month string (UTC)
// ----------------------------------------------------------------

const getCurrentYearMonth = (): string => {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

// ----------------------------------------------------------------
// Create a QR code
// ----------------------------------------------------------------

export const createQrCode = async (
  input: CreateQrCodeInput,
  userId: number,
): Promise<QrCodeSummary> => {
  // 1. Assert quota
  await assertCanCreateQrCode(userId);

  const fgColor = input.fgColor ?? "#000000";
  const bgColor = input.bgColor ?? "#ffffff";
  const errorCorrection = input.errorCorrection ?? "Q";
  const size = input.size ?? 300;
  const urlMappingId = input.urlMappingId ? BigInt(input.urlMappingId) : null;

  // 2. Generate PNG data URL server-side
  const dataUrl = await generateQrCodeDataUrl({
    destinationUrl: input.destinationUrl,
    fgColor,
    bgColor,
    errorCorrection,
    size,
  });

  // 3. Upload to Cloudinary (best-effort)
  let cloudinaryPublicId: string | null = null;
  let cloudinaryUrl: string | null = null;

  try {
    const timestamp = Date.now();
    const publicId = `shortlink/qr_codes/${userId}/qr_${timestamp}`;
    const uploaded = await uploadQrCodeToCloudinary(dataUrl, publicId);
    cloudinaryPublicId = uploaded.publicId;
    cloudinaryUrl = uploaded.secureUrl;
  } catch (err) {
    logger.warn("QR: Cloudinary upload failed, storing without URL", { error: err });
  }

  // 4. Insert DB row
  const row = await createQrCodeRepo({
    user_id: userId,
    url_mapping_id: urlMappingId,
    destination_url: input.destinationUrl,
    short_code: null, // filled later if linked to a short link
    title: input.title ?? null,
    fg_color: fgColor,
    bg_color: bgColor,
    error_correction: errorCorrection,
    size,
    cloudinary_public_id: cloudinaryPublicId,
    cloudinary_url: cloudinaryUrl,
  });

  // 5. Mark url_mapping.has_qr = true (if linked)
  if (urlMappingId) {
    try {
      await setUrlMappingHasQrRepo(urlMappingId, true);
    } catch (err) {
      logger.warn("QR: failed to set has_qr on url_mapping", { urlMappingId, error: err });
    }
  }

  // 6. Increment monthly quota usage
  await incrementQrCodeUsageRepo(userId, getCurrentYearMonth());

  return serializeQrCode({ ...row, is_active: row.is_active ?? true });
};

// ----------------------------------------------------------------
// Create a QR code linked to a short link (called from link creation flow)
// ----------------------------------------------------------------

export const createQrCodeForLink = async (input: {
  destinationUrl: string;      // the short URL itself
  urlMappingId: bigint;
  shortCode: string;
  userId: number;
  fgColor?: string;
  bgColor?: string;
}): Promise<QrCodeSummary | null> => {
  const fgColor = input.fgColor ?? "#000000";
  const bgColor = input.bgColor ?? "#ffffff";
  const errorCorrection = "Q" as const;
  const size = 300;

  let dataUrl: string;
  try {
    dataUrl = await generateQrCodeDataUrl({
      destinationUrl: input.destinationUrl,
      fgColor,
      bgColor,
      errorCorrection,
      size,
    });
  } catch (err) {
    logger.error("QR: failed to generate PNG for link QR", { error: err });
    return null;
  }

  let cloudinaryPublicId: string | null = null;
  let cloudinaryUrl: string | null = null;

  try {
    const timestamp = Date.now();
    const publicId = `shortlink/qr_codes/${input.userId}/qr_${timestamp}`;
    const uploaded = await uploadQrCodeToCloudinary(dataUrl, publicId);
    cloudinaryPublicId = uploaded.publicId;
    cloudinaryUrl = uploaded.secureUrl;
  } catch (err) {
    logger.warn("QR: Cloudinary upload failed for link QR", { error: err });
  }

  const row = await createQrCodeRepo({
    user_id: input.userId,
    url_mapping_id: input.urlMappingId,
    destination_url: input.destinationUrl,
    short_code: input.shortCode,
    title: null,
    fg_color: fgColor,
    bg_color: bgColor,
    error_correction: errorCorrection,
    size,
    cloudinary_public_id: cloudinaryPublicId,
    cloudinary_url: cloudinaryUrl,
  });

  try {
    await setUrlMappingHasQrRepo(input.urlMappingId, true);
  } catch (err) {
    logger.warn("QR: failed to set has_qr on url_mapping", { urlMappingId: input.urlMappingId, error: err });
  }

  await incrementQrCodeUsageRepo(input.userId, getCurrentYearMonth());

  return serializeQrCode({ ...row, is_active: row.is_active ?? true });
};

// ----------------------------------------------------------------
// List QR codes (paginated)
// ----------------------------------------------------------------

export const getUserQrCodes = async (
  userId: number,
  options: GetUserQrCodesOptions & { limit?: number } = {},
): Promise<GetUserQrCodesResult> => {
  const { limit } = options;
  const rows = await getUserQrCodesRepo(userId, options);

  const hasNextPage = limit !== undefined && rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;

  const qrCodes = items.map(serializeQrCode);

  const nextCursor =
    hasNextPage && items.length > 0
      ? items.at(-1)?.id.toString() ?? null
      : null;

  return { qrCodes, hasNextPage, nextCursor };
};

// ----------------------------------------------------------------
// Get single QR code
// ----------------------------------------------------------------

export const getQrCodeById = async (
  id: bigint,
  userId: number,
): Promise<QrCodeSummary | null> => {
  const row = await getQrCodeByIdRepo(id, userId);
  if (!row) return null;
  return serializeQrCode({ ...row, is_active: row.is_active ?? true });
};

// ----------------------------------------------------------------
// Get QR code linked to a short code
// ----------------------------------------------------------------

export const getQrCodeByShortCode = async (
  shortCode: string,
  userId: number,
): Promise<QrCodeSummary | null> => {
  const row = await getQrCodeByShortCodeRepo(shortCode, userId);
  if (!row) return null;
  return serializeQrCode(row);
};

// ----------------------------------------------------------------
// Soft delete
// ----------------------------------------------------------------

export const deleteQrCode = async (
  id: bigint,
  userId: number,
): Promise<void> => {
  const deleted = await softDeleteQrCodeRepo(id, userId);

  if (!deleted) {
    throw new NotFoundError("QR code not found.");
  }

  // Remove Cloudinary asset (fire-and-forget)
  if (deleted.cloudinary_public_id) {
    void deleteQrCodeFromCloudinary(deleted.cloudinary_public_id);
  }

  // If linked to a url_mapping, clear has_qr flag
  if (deleted.url_mapping_id) {
    try {
      await setUrlMappingHasQrRepo(deleted.url_mapping_id, false);
    } catch (err) {
      logger.warn("QR: failed to clear has_qr on url_mapping", { error: err });
    }
  }
};

// ----------------------------------------------------------------
// Regenerate (update visual options + re-upload)
// ----------------------------------------------------------------

export interface RegenerateQrCodeInput {
  fgColor?: string;
  bgColor?: string;
  errorCorrection?: "L" | "M" | "Q" | "H";
  size?: number;
  title?: string | null;
}

export const regenerateQrCode = async (
  id: bigint,
  userId: number,
  newOptions: RegenerateQrCodeInput,
): Promise<QrCodeSummary> => {
  const existing = await getQrCodeByIdRepo(id, userId);
  if (!existing) {
    throw new NotFoundError("QR code not found.");
  }

  const fgColor = newOptions.fgColor ?? existing.fg_color;
  const bgColor = newOptions.bgColor ?? existing.bg_color;
  const errorCorrection = (newOptions.errorCorrection ?? existing.error_correction) as "L" | "M" | "Q" | "H";
  const size = newOptions.size ?? existing.size;

  // Re-generate PNG
  const dataUrl = await generateQrCodeDataUrl({
    destinationUrl: existing.destination_url,
    fgColor,
    bgColor,
    errorCorrection,
    size,
  });

  // Re-upload (overwrite existing asset or create new one)
  let cloudinaryPublicId = existing.cloudinary_public_id;
  let cloudinaryUrl = existing.cloudinary_url;

  try {
    const publicId = cloudinaryPublicId ?? `shortlink/qr_codes/${userId}/qr_${Date.now()}`;
    const uploaded = await uploadQrCodeToCloudinary(dataUrl, publicId);
    cloudinaryPublicId = uploaded.publicId;
    cloudinaryUrl = uploaded.secureUrl;
  } catch (err) {
    logger.warn("QR: Cloudinary re-upload failed", { error: err });
  }

  const updated = await updateQrCodeRepo(id, userId, {
    fg_color: fgColor,
    bg_color: bgColor,
    error_correction: errorCorrection,
    size,
    cloudinary_public_id: cloudinaryPublicId,
    cloudinary_url: cloudinaryUrl,
    ...(newOptions.title !== undefined ? { title: newOptions.title } : {}),
  });

  return serializeQrCode({ ...updated, is_active: updated.is_active ?? true });
};
