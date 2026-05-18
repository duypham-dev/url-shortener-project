import { prisma } from "../libs/prisma";
import type { Prisma } from '../../generated/prisma/client';

export const getUrlOwnerContextRepo = async (shortCode: string) => {
  return await prisma.url_mappings.findUnique({
    where: { short_code: shortCode },
    select: {
      id: true,
      user_id: true,
    },
  });
};

export const getLinkByIdAndUserIdRepo = async (id: bigint, userId: number) => {
  return prisma.url_mappings.findFirst({
    where: {
      id,
      user_id: userId,
      is_active: true,
      short_code: { not: null },
    },
    select: {
      id: true,
      short_code: true,
      has_qr: true,
    }
  });
};

export interface GetUserLinksOptions {
  limit?: number; // max items to return
  cursor?: bigint; // exclusive cursor (id of the last item on the previous page)
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Fetches paginated active links for a user.
 */
export const getUserLinksRepo = async (
  userId: number,
  options: GetUserLinksOptions = {},
) => {
  const { limit, cursor, search, startDate, endDate, sortBy, sortOrder } = options;

  const whereClause: Prisma.url_mappingsWhereInput = {
    user_id: userId,
    is_active: true,
  };

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { long_url: { contains: search, mode: "insensitive" } },
      { short_code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (startDate || endDate) {
    whereClause.created_at = {};
    if (startDate) whereClause.created_at.gte = new Date(startDate);
    if (endDate) whereClause.created_at.lte = new Date(endDate);
  }

  const orderBy: Prisma.url_mappingsOrderByWithRelationInput[] = [];
  const order: Prisma.SortOrder = (sortOrder === "asc" || sortOrder === "desc") ? sortOrder : "desc";
  switch (sortBy) {
    case "createdAt":
      orderBy.push({ created_at: order });
      break;
    case "clickCount":
      orderBy.push({ click_count: order });
      break;
    case "title":
      orderBy.push({ title: order });
      break;
    default:
      orderBy.push({ created_at: "desc" });
      break;
  }
  
  orderBy.push({ id: "desc" });
  
  return await prisma.url_mappings.findMany({
    where: whereClause,
    orderBy: orderBy,
    ...(limit !== undefined ? { take: limit + 1 } : {}),
    ...(cursor !== undefined ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      short_code: true,
      long_url: true,
      title: true,
      has_qr: true,
      created_at: true,
      click_count: true,
    },
  });
};

export const getLinkInfoByShortCodeRepo = async (
  shortCode: string,
  userId: number,
) => {
  return await prisma.url_mappings.findFirst({
    where: { short_code: shortCode, user_id: userId, is_active: true },
    select: {
      id: true,
      short_code: true,
      long_url: true,
      title: true,
      has_qr: true,
      created_at: true,
      click_count: true,
    },
  });
};

export const getLongUrlByShortCodeRepo = async (shortCode: string) => {
  return await prisma.url_mappings.findUnique({
    where: { short_code: shortCode },
    select: { long_url: true, has_qr: true, expires_at: true },
  });
};

/**
 * Returns true if a short code already exists in the DB (used for custom alias
 * uniqueness check — includes inactive links to prevent collision).
 */
export const shortCodeExistsRepo = async (shortCode: string): Promise<boolean> => {
  const record = await prisma.url_mappings.findUnique({
    where: { short_code: shortCode },
    select: { id: true },
  });
  return record !== null;
};

/**
 * Increments the custom_link_count usage counter for a user in the given month.
 * Used after creating a custom alias short link.
 */
export const incrementCustomLinkUsageRepo = async (
  userId: number,
  yearMonth: string,
): Promise<void> => {
  await prisma.user_link_monthly_usage.upsert({
    where: { user_id_year_month: { user_id: userId, year_month: yearMonth } },
    update: { custom_link_count: { increment: 1 } },
    create: {
      user_id: userId,
      year_month: yearMonth,
      link_count: 0,
      custom_link_count: 1,
      qr_code_count: 0,
    },
  });
};

/**
 * Increments the link_count usage counter for a user in the given month.
 * Used after creating a regular short link.
 */
export const incrementLinkUsageRepo = async (
  userId: number,
  yearMonth: string,
) => {
  return prisma.user_link_monthly_usage.upsert({
    where: { user_id_year_month: { user_id: userId, year_month: yearMonth } },
    update: { link_count: { increment: 1 } },
    create: {
      user_id: userId,
      year_month: yearMonth,
      link_count: 1,
      custom_link_count: 0,
      qr_code_count: 0,
    },
  });
};

export const updateLinkRepo = async (
  shortCode: string,
  userId: number,
  data: { title?: string },
) => {
  return prisma.url_mappings.updateMany({
    where: { short_code: shortCode, user_id: userId },
    data,
  });
};
