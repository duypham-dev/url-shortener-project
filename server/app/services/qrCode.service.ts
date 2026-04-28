import { logger } from "../utils/logger.js";
import {
  createQrCodeRepo,
  getUserQrCodesRepo,
  getQrCodeByIdRepo,
  getQrCodeByShortCodeRepo,
  updateQrCodeRepo,
  setUrlMappingHasQrRepo,
  incrementQrCodeUsageRepo,
  disableQrCodeRepo,
  type GetUserQrCodesOptions,
} from "../repositories/qrCode.repo.js";
import { getLinkByIdAndUserIdRepo } from "../repositories/link.repo.js";
import dotenv from "dotenv";
import { NotFoundError, ConflictError } from "../errors/app.error.js";
import { cacheLink, invalidateCachedLink } from "./linkCache.service.js";

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
  destinationUrl: string; // tracking URL ({shortUrl}?r=qr)
  displayUrl: string; // clean URL for display (no ?r=qr)
  shortCode: string | null;
  title: string | null;
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
  userId: number,
): Promise<QrCodeSummary> => {
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

  const baseUrl =
    process.env.SHORT_LINK_BASE_URL ?? "http://localhost:3000/api/v1";

  const destinationUrl = `${baseUrl}/${link.short_code}`;

  const qrCode = await createQrCodeForLink({
    destinationUrl,
    urlMappingId: input.urlMappingId,
    shortCode: link.short_code,
    userId,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.fgColor ? { fgColor: input.fgColor } : {}),
    ...(input.bgColor ? { bgColor: input.bgColor } : {}),
    ...(input.errorCorrection
      ? { errorCorrection: input.errorCorrection }
      : {}),
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
  destinationUrl: string; // the plain short URL
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

  let row;
  try {
    row = await createQrCodeRepo({
      user_id: input.userId,
      url_mapping_id: input.urlMappingId,
      destination_url: trackingUrl,
      short_code: input.shortCode,
      title: input.title ?? null,
      fg_color: fgColor,
      bg_color: bgColor,
      error_correction: errorCorrection,
      size,
    });
  } catch (err) {
    logger.error("QR: failed to insert QR record", { error: err });
    return null;
  }

  try {
    await setUrlMappingHasQrRepo(input.urlMappingId, true);
    // Invalidate cache for the short code so that the redirect endpoint will fetch the updated has_qr=true value on next hit
    await invalidateCachedLink(input.shortCode)
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
      ? (items.at(-1)?.id.toString() ?? null)
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
  try {
    const deletedQr = await disableQrCodeRepo(id, userId);

    if (deletedQr.short_code) {
      await invalidateCachedLink(deletedQr.short_code);
    }
  } catch (error: any) {
    throw error;
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
  const errorCorrection = (newOptions.errorCorrection ??
    existing.error_correction) as "L" | "M" | "Q" | "H";
  const size = newOptions.size ?? existing.size;

  const updated = await updateQrCodeRepo(id, userId, {
    fg_color: fgColor,
    bg_color: bgColor,
    error_correction: errorCorrection,
    size,
    ...(newOptions.title !== undefined ? { title: newOptions.title } : {}),
  });

  return serializeQrCode({ ...updated, is_active: updated.is_active ?? true });
};
