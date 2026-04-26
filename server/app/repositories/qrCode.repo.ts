/**
 * qrCode.repo.ts
 *
 * Repository layer for qr_codes table.
 * All DB access for QR codes goes through here — services must not import prisma directly.
 *
 * Pagination: cursor-based, same pattern as getUserLinksRepo.
 */
import { prisma } from "../libs/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface CreateQrCodeData {
  user_id: number;
  url_mapping_id?: bigint | null;
  destination_url: string;
  short_code?: string | null;
  title?: string | null;
  fg_color: string;
  bg_color: string;
  error_correction: string;
  size: number;
  cloudinary_public_id?: string | null;
  cloudinary_url?: string | null;
}

export interface GetUserQrCodesOptions {
  limit?: number;
  cursor?: bigint;
  search?: string;
  startDate?: string;
  endDate?: string;
  urlMappingId?: bigint;
}

export interface UpdateQrCodeData {
  title?: string | null;
  fg_color?: string;
  bg_color?: string;
  error_correction?: string;
  size?: number;
  cloudinary_public_id?: string | null;
  cloudinary_url?: string | null;
  updated_at?: Date;
}

// ----------------------------------------------------------------
// Create
// ----------------------------------------------------------------

export const createQrCodeRepo = async (data: CreateQrCodeData) => {
  return prisma.qr_codes.create({
    data: {
      user_id: data.user_id,
      url_mapping_id: data.url_mapping_id ?? null,
      destination_url: data.destination_url,
      short_code: data.short_code ?? null,
      title: data.title ?? null,
      fg_color: data.fg_color,
      bg_color: data.bg_color,
      error_correction: data.error_correction,
      size: data.size,
      cloudinary_public_id: data.cloudinary_public_id ?? null,
      cloudinary_url: data.cloudinary_url ?? null,
    },
  });
};

// ----------------------------------------------------------------
// List with cursor-based pagination
// ----------------------------------------------------------------

export const getUserQrCodesRepo = async (
  userId: number,
  options: GetUserQrCodesOptions = {},
) => {
  const { limit, cursor, search, startDate, endDate, urlMappingId } = options;

  const whereClause: Prisma.qr_codesWhereInput = {
    user_id: userId,
    is_active: true,
  };

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { destination_url: { contains: search, mode: "insensitive" } },
      { short_code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (startDate || endDate) {
    whereClause.created_at = {};
    if (startDate) whereClause.created_at.gte = new Date(startDate);
    if (endDate) whereClause.created_at.lte = new Date(endDate);
  }

  if (urlMappingId !== undefined) {
    whereClause.url_mapping_id = urlMappingId;
  }

  return prisma.qr_codes.findMany({
    where: whereClause,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    ...(limit !== undefined ? { take: limit + 1 } : {}), // fetch one extra to detect hasNextPage
    ...(cursor !== undefined ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      user_id: true,
      url_mapping_id: true,
      destination_url: true,
      short_code: true,
      title: true,
      fg_color: true,
      bg_color: true,
      error_correction: true,
      size: true,
      cloudinary_url: true,
      cloudinary_public_id: true,
      scan_count: true,
      is_active: true,
      created_at: true,
    },
  });
};

// ----------------------------------------------------------------
// Get by ID (ownership check)
// ----------------------------------------------------------------

export const getQrCodeByIdRepo = async (id: bigint, userId: number) => {
  return prisma.qr_codes.findFirst({
    where: { id, user_id: userId, is_active: true },
  });
};

// ----------------------------------------------------------------
// Get by short code (for LinkQRCode component endpoint)
// ----------------------------------------------------------------

export const getQrCodeByShortCodeRepo = async (
  shortCode: string,
  userId: number,
) => {
  return prisma.qr_codes.findFirst({
    where: { short_code: shortCode, user_id: userId, is_active: true },
    select: {
      id: true,
      user_id: true,
      url_mapping_id: true,
      destination_url: true,
      short_code: true,
      title: true,
      fg_color: true,
      bg_color: true,
      error_correction: true,
      size: true,
      cloudinary_url: true,
      cloudinary_public_id: true,
      scan_count: true,
      is_active: true,
      created_at: true,
    },
  });
};

// ----------------------------------------------------------------
// Update
// ----------------------------------------------------------------

export const updateQrCodeRepo = async (
  id: bigint,
  userId: number,
  data: UpdateQrCodeData,
) => {
  return prisma.qr_codes.update({
    where: { id, user_id: userId },
    data: {
      ...data,
      updated_at: new Date(),
    },
  });
};

// ----------------------------------------------------------------
// Soft delete
// ----------------------------------------------------------------

export const softDeleteQrCodeRepo = async (id: bigint, userId: number) => {
  return prisma.qr_codes.update({
    where: { id, user_id: userId },
    data: { is_active: false, updated_at: new Date() },
    select: { cloudinary_public_id: true, url_mapping_id: true },
  });
};

// ----------------------------------------------------------------
// Mark url_mapping.has_qr
// ----------------------------------------------------------------

export const setUrlMappingHasQrRepo = async (
  urlMappingId: bigint,
  hasQr: boolean,
) => {
  return prisma.url_mappings.update({
    where: { id: urlMappingId },
    data: { has_qr: hasQr },
  });
};

// ----------------------------------------------------------------
// Increment monthly QR quota usage (upsert pattern, same as link quota)
// ----------------------------------------------------------------

export const incrementQrCodeUsageRepo = async (
  userId: number,
  yearMonth: string,
) => {
  return prisma.user_link_monthly_usage.upsert({
    where: { user_id_year_month: { user_id: userId, year_month: yearMonth } },
    update: { qr_code_count: { increment: 1 } },
    create: {
      user_id: userId,
      year_month: yearMonth,
      link_count: 0,
      custom_link_count: 0,
      qr_code_count: 1,
    },
  });
};
