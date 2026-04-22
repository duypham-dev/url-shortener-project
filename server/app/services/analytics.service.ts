/**
 * analytics.service.ts
 *
 * Service layer for link click analytics.
 * Queries click_logs table grouped by date for a given short_code.
 */
import { getClickLogsRepo, getLinkBreakdownAnalyticsRepo, type LinkBreakdownAnalyticsResult, type AnalyticsBreakdownItem, getLinkReferrerAnalyticsRepo, isLinkOwnedByUserRepo, getDailyClickAnalyticsRepo } from "../repositories/analytics.repo";

export interface DailyClickRow {
  date: string;   // YYYY-MM-DD
  clicks: number;
}

export type { AnalyticsBreakdownItem, LinkBreakdownAnalyticsResult };

export interface LinkAnalyticsResult {
  shortCode: string;
  totalClicks: number;
  dailyClicks: DailyClickRow[];
}

export interface ClickLogRow {
  id: string;
  urlMappingId: string;
  userId: number | null;
  clickedAt: string | null;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
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

  const [rows, total] = await getClickLogsRepo(shortCode, take, skip);

  const formatted = rows.map((r) => ({
    id: typeof r.id === 'bigint' ? r.id.toString() : String(r.id),
    urlMappingId:
      typeof r.url_mapping_id === 'bigint'
        ? r.url_mapping_id.toString()
        : String(r.url_mapping_id),
    userId: r.user_id ?? null,
    clickedAt: r.clicked_at ? r.clicked_at.toISOString() : null,
    ipAddress: r.ip_address ?? null,
    browser: r.browser ?? null,
    os: r.os ?? null,
    deviceType: r.device_type ?? null,
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

export const getLinkBreakdownAnalytics = async (
  shortCode: string,
): Promise<LinkBreakdownAnalyticsResult> => {
  return await getLinkBreakdownAnalyticsRepo(shortCode);
};

export const getLinkReferrerAnalytics = async (shortCode: string) => {
  const referrers = await getLinkReferrerAnalyticsRepo(shortCode);
  return referrers.map(r => ({
    referrer: r.referrer || 'Direct',
    clicks: r._count.referrer,
  }));
};

/**
 * Verify that a link belongs to the given user.
 * Returns true if the link exists and is owned by userId.
 */
export const isLinkOwnedByUser = async (
  shortCode: string,
  userId: number,
): Promise<boolean> => {
  const link = await isLinkOwnedByUserRepo(shortCode);
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
  const rows = await getDailyClickAnalyticsRepo(shortCode, since);

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
