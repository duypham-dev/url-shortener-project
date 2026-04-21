/**
 * analytics.service.ts
 *
 * Service layer for link click analytics.
 * Queries click_logs table grouped by date for a given short_code.
 */
import { prisma } from "../libs/prisma";

export interface DailyClickRow {
  date: string;   // YYYY-MM-DD
  clicks: number;
}

export interface LinkAnalyticsResult {
  shortCode: string;
  totalClicks: number;
  dailyClicks: DailyClickRow[];
}

export interface ClickLogRow {
  id: string;
  clickedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  country: string | null;
}

export interface ClickLogsResult {
  shortCode: string;
  total: number;
  page: number;
  pageSize: number;
  rows: ClickLogRow[];
}

export const getClickLogs = async (
  shortCode: string,
  page: number = 1,
  pageSize: number = 50,
): Promise<ClickLogsResult> => {
  const take = pageSize;
  const skip = (Math.max(1, page) - 1) * pageSize;

  const [rows, total] = await prisma.$transaction([
    prisma.click_logs.findMany({
      where: { short_code: shortCode },
      orderBy: { clicked_at: 'desc' },
      take,
      skip,
      select: {
        id: true,
        clicked_at: true,
        ip_address: true,
        user_agent: true,
        referrer: true,
        country: true,
      },
    }),
    prisma.click_logs.count({ where: { short_code: shortCode } }),
  ]);

  const formatted = rows.map((r) => ({
    id: typeof r.id === 'bigint' ? r.id.toString() : String(r.id),
    clickedAt: r.clicked_at ? r.clicked_at.toISOString() : null,
    ipAddress: r.ip_address ?? null,
    userAgent: r.user_agent ?? null,
    referrer: r.referrer ?? null,
    country: r.country ?? null,
  }));

  return {
    shortCode,
    total,
    page,
    pageSize: take,
    rows: formatted,
  };
};

export const getLinkReferrerAnalytics = async (shortCode: string) => {
  const referrers = await prisma.click_logs.groupBy({
    by: ['referrer'],
    where: { short_code: shortCode },
    _count: { referrer: true },
    orderBy: { _count: { referrer: 'desc' } },
    take: 10,
  });
  console.log(`Referrer analytics for ${shortCode}:`, referrers);
  return referrers.map(r => ({
    referrer: r.referrer || 'Direct',
    clicks: r._count.referrer,
  }));
}

/**
 * Verify that a link belongs to the given user.
 * Returns true if the link exists and is owned by userId.
 */
export const isLinkOwnedByUser = async (
  shortCode: string,
  userId: number,
): Promise<boolean> => {
  const link = await prisma.url_mappings.findUnique({
    where: { short_code: shortCode },
    select: { user_id: true },
  });
  return link?.user_id === userId;
};

/**
 * Get daily click analytics for a link over the last N days.
 * Uses click_logs table with idx_click_short_code index.
 */
export const getDailyClickAnalytics = async (
  shortCode: string,
  days: number = 30,
): Promise<LinkAnalyticsResult> => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Raw query for date grouping (Prisma doesn't support GROUP BY DATE natively)
  const rows = await prisma.$queryRaw<{ date: Date; clicks: bigint }[]>`
    SELECT 
      DATE(clicked_at) as date,
      COUNT(*)::bigint as clicks
    FROM shortlink.click_logs
    WHERE short_code = ${shortCode}
      AND clicked_at >= ${since}
    GROUP BY DATE(clicked_at)
    ORDER BY date ASC
  `;

  const dailyClicks: DailyClickRow[] = rows
    .filter((row) => row.date !== null)
    .map((row) => ({
      date: new Date(row.date).toISOString().split("T")[0]!,
      clicks: Number(row.clicks),
    }));

  const totalClicks = dailyClicks.reduce((sum, d) => sum + d.clicks, 0);

  return {
    shortCode,
    totalClicks,
    dailyClicks,
  };
};
