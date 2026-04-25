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

export interface GetUserLinksOptions {
  limit?: number; // max items to return
  cursor?: bigint; // exclusive cursor (id of the last item on the previous page)
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const getUserLinksRepo = async (
  userId: number,
  options: GetUserLinksOptions = {},
) => {
  const { limit, cursor, search, startDate, endDate } = options;

  const whereClause: Prisma.url_mappingsWhereInput = { user_id: userId, is_active: true };

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

  return await prisma.url_mappings.findMany({
    where: whereClause,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    ...(limit !== undefined ? { take: limit + 1 } : {}), // fetch one extra to determine hasNextPage
    ...(cursor !== undefined ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      short_code: true,
      long_url: true,
      title: true,
      created_at: true,
      _count: {
        select: {
          click_logs: true,
        },
      },
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
      short_code: true,
      long_url: true,
      title: true,
      created_at: true,
      _count: {
        select: {
          click_logs: true,
        },
      },
    },
  });
};

export const getLongUrlByShortCodeRepo = async (shortCode: string) => {
  return await prisma.url_mappings.findUnique({
    where: { short_code: shortCode },
    select: { long_url: true },
  });
};
