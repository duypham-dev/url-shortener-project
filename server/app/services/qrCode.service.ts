/**
 * qrCode.service.ts
 *
 * Business logic for QR code lifecycle:
 *   create-for-link → list → get → delete → regenerate
 *
 * Notes:
 *   - Every QR code must be linked to an existing short link via url_mapping_id.
 *   - The URL embedded in QR images uses the ?r=qr marker for scan tracking.
 *   - Cloudinary upload is best-effort; fallback rendering still works without it.
 */
import QRCode from "qrcode";
import { logger } from "../utils/logger.js";
import { assertCanCreateQrCode } from "./subscriptionAccess.service.js";
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
import { getLinkByIdAndUserIdRepo } from "../repositories/link.repo.js";
import config from "config";
import { NotFoundError, ConflictError } from "../errors/app.error.js";

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

export interface QrCodeSummary {
  id: string;
  userId: number;
  urlMappingId: string;
  destinationUrl: string;     // tracking URL ({shortUrl}?r=qr)
  displayUrl: string;         // clean URL for display (no ?r=qr)
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

type QrCodeRow = {
  id: bigint;
  user_id: number;
  url_mapping_id: bigint;
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
};

const serializeQrCode = (row: QrCodeRow): QrCodeSummary => {
  const trackingUrl = row.destination_url;
  const displayUrl = trackingUrl.replace(/\?r=qr$/, "");

  return {
    id: row.id.toString(),
    userId: row.user_id,
    urlMappingId: row.url_mapping_id.toString(),
    destinationUrl: trackingUrl,
    displayUrl,
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
  };
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
// Helper: upload to Cloudinary (best-effort)
// ----------------------------------------------------------------

const uploadToCloudinary = async (
  dataUrl: string,
  userId: number,
): Promise<{ publicId: string | null; url: string | null }> => {
  try {
    const timestamp = Date.now();
    const publicId = `shortlink/qr_codes/${userId}/qr_${timestamp}`;
    const uploaded = await uploadQrCodeToCloudinary(dataUrl, publicId);
    return { publicId: uploaded.publicId, url: uploaded.secureUrl };
  } catch (err) {
    logger.warn("QR: Cloudinary upload failed, storing without URL", { error: err });
    return { publicId: null, url: null };
  }
};

// ----------------------------------------------------------------
// Create a QR code for an existing link
// ----------------------------------------------------------------
export const createQrCodeFromExistingLink = async (
  input: {
    urlMappingId: bigint;
    fgColor?: string;
    bgColor?: string;
    errorCorrection?: "L" | "M" | "Q" | "H";
    size?: number;
    title?: string | null;
  },
  userId: number
): Promise<QrCodeSummary> => {
  await assertCanCreateQrCode(userId);

  const link = await getLinkByIdAndUserIdRepo(input.urlMappingId, userId);
  if (!link) {
    throw new NotFoundError("Link not found or you don't have access.");
  }
  if (link.has_qr) {
    throw new ConflictError("This link already has a QR code.");
  }
  if (!link.short_code) {
    throw new ConflictError("Link short code is not ready yet.");
  }

  const baseUrl = config.has("SHORT_LINK_BASE_URL")
    ? config.get<string>("SHORT_LINK_BASE_URL")
    : "http://localhost:3000";

  const destinationUrl = `${baseUrl}/${link.short_code}`;

  const qrCode = await createQrCodeForLink({
    destinationUrl,
    urlMappingId: input.urlMappingId,
    shortCode: link.short_code,
    userId,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.fgColor ? { fgColor: input.fgColor } : {}),
    ...(input.bgColor ? { bgColor: input.bgColor } : {}),
    ...(input.errorCorrection ? { errorCorrection: input.errorCorrection } : {}),
    ...(input.size ? { size: input.size } : {}),
  });

  if (!qrCode) {
    throw new Error("Failed to create QR code.");
  }

  return qrCode;
};

// ----------------------------------------------------------------
// Create a QR code linked to an already-existing short link.
// Called from the link creation flow when generateQr=true.
//
// The companion short link already exists.
// No link quota check needed here — the link was already counted.
// QR quota IS consumed.
// ----------------------------------------------------------------

export const createQrCodeForLink = async (input: {
  destinationUrl: string;  // the plain short URL (e.g. https://short.ly/abc)
  urlMappingId: bigint;
  shortCode: string;
  userId: number;
  title?: string | null;
  fgColor?: string;
  bgColor?: string;
  errorCorrection?: "L" | "M" | "Q" | "H";
  size?: number;
}): Promise<QrCodeSummary | null> => {
  const fgColor = input.fgColor ?? "#000000";
  const bgColor = input.bgColor ?? "#ffffff";
  const errorCorrection = input.errorCorrection ?? "Q";
  const size = input.size ?? 300;

  // Build tracking URL for QR image
  const trackingUrl = `${input.destinationUrl}?r=qr`;

  let dataUrl: string;
  try {
    dataUrl = await generateQrCodeDataUrl({
      destinationUrl: trackingUrl,
      fgColor,
      bgColor,
      errorCorrection,
      size,
    });
  } catch (err) {
    logger.error("QR: failed to generate PNG for link QR", { error: err });
    return null;
  }

  const { publicId: cloudinaryPublicId, url: cloudinaryUrl } =
    await uploadToCloudinary(dataUrl, input.userId);

  const row = await createQrCodeRepo({
    user_id: input.userId,
    url_mapping_id: input.urlMappingId,
    destination_url: trackingUrl,
    short_code: input.shortCode,
    title: input.title ?? null,
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
    logger.warn("QR: failed to set has_qr on url_mapping", { error: err });
  }

  await incrementQrCodeUsageRepo(input.userId, getCurrentYearMonth());

  return serializeQrCode({
    ...row,
    is_active: row.is_active ?? true,
  });
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

  const qrCodes = items.map((row) =>
    serializeQrCode({
      ...row,
      is_active: row.is_active ?? true,
    }),
  );

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
  return serializeQrCode({ ...row, is_active: row.is_active ?? true });
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

  // Clear has_qr flag on the companion url_mapping
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

  // Re-generate PNG using the stored tracking URL (already has ?r=qr)
  const dataUrl = await generateQrCodeDataUrl({
    destinationUrl: existing.destination_url,
    fgColor,
    bgColor,
    errorCorrection,
    size,
  });

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
