/**
 * analytics.service.ts
 *
 * Service layer for link click analytics.
 * Each function targets a single analytics dimension, called by the controller
 * based on the `groupBy` query parameter.
 */
import {
  getTimeseriesClicksRepo,
  getReferrersRepo,
  getCountriesRepo,
  getDevicesRepo,
  getTopLinksRepo,
  getClickLogsRepo,
  isLinkOwnedByUserRepo,
} from "../repositories/analytics.repo.js";

import type {
  TimeseriesItem,
  TimeseriesResult,
  TimeseriesMode,
  ReferrerItem,
  BreakdownItem,
  DeviceBreakdownResult,
  TopLinkItem,
} from "../types/analytics.type.js";

// ----------------------------------------------------------------
// Click log types (preserved)
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// Zero-fill utilities
// ----------------------------------------------------------------

/**
 * Generate all hourly bucket keys between start and end.
 * Bucket format: "YYYY-MM-DDTHH:00"
 */
const generateHourlyBuckets = (start: Date, end: Date): string[] => {
  const buckets: string[] = [];
  const cursor = new Date(start);
  // Truncate to the top of the hour
  cursor.setMinutes(0, 0, 0);

  while (cursor <= end) {
    const yyyy = cursor.getUTCFullYear();
    const mm = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getUTCDate()).padStart(2, "0");
    const hh = String(cursor.getUTCHours()).padStart(2, "0");
    buckets.push(`${yyyy}-${mm}-${dd}T${hh}:00`);
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }

  return buckets;
};

/**
 * Generate all daily bucket keys between start and end.
 * Bucket format: "YYYY-MM-DD"
 */
const generateDailyBuckets = (start: Date, end: Date): string[] => {
  const buckets: string[] = [];
  const cursor = new Date(start);
  // Truncate to start of day
  cursor.setUTCHours(0, 0, 0, 0);

  const endDay = new Date(end);
  endDay.setUTCHours(23, 59, 59, 999);

  while (cursor <= endDay) {
    const yyyy = cursor.getUTCFullYear();
    const mm = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getUTCDate()).padStart(2, "0");
    buckets.push(`${yyyy}-${mm}-${dd}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return buckets;
};

/**
 * Group raw click timestamps into hourly buckets and zero-fill gaps.
 */
const groupByHour = (
  clicks: { clicked_at: Date | null }[],
  start: Date,
  end: Date,
): TimeseriesItem[] => {
  const allBuckets = generateHourlyBuckets(start, end);
  const countMap = new Map<string, number>();

  // Initialize all buckets to 0
  for (const b of allBuckets) {
    countMap.set(b, 0);
  }

  // Count clicks into buckets
  for (const row of clicks) {
    if (!row.clicked_at) continue;
    const d = row.clicked_at;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}T${hh}:00`;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  return allBuckets.map((bucket) => ({
    bucket,
    clicks: countMap.get(bucket) ?? 0,
  }));
};

/**
 * Group raw click timestamps into daily buckets and zero-fill gaps.
 */
const groupByDay = (
  clicks: { clicked_at: Date | null }[],
  start: Date,
  end: Date,
): TimeseriesItem[] => {
  const allBuckets = generateDailyBuckets(start, end);
  const countMap = new Map<string, number>();

  // Initialize all buckets to 0
  for (const b of allBuckets) {
    countMap.set(b, 0);
  }

  // Count clicks into buckets
  for (const row of clicks) {
    if (!row.clicked_at) continue;
    const d = row.clicked_at;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  return allBuckets.map((bucket) => ({
    bucket,
    clicks: countMap.get(bucket) ?? 0,
  }));
};

// ----------------------------------------------------------------
// Per-dimension analytics
// ----------------------------------------------------------------

/**
 * Get click timeseries for a link, either hourly (last24h) or daily (custom).
 * Returns a continuous array with zero-filled gaps — every bucket is present.
 */
export const getTimeseriesAnalytics = async (
  shortCode: string,
  start: string,
  end: string,
  _timezone: string,
  mode: TimeseriesMode,
): Promise<TimeseriesResult> => {
  // For last24h mode, override start/end to exactly the last 24 hours
  const effectiveStart = mode === "last24h"
    ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    : start;
  const effectiveEnd = mode === "last24h"
    ? new Date().toISOString()
    : end;

  const rows = await getTimeseriesClicksRepo(shortCode, effectiveStart, effectiveEnd);

  const startDate = new Date(effectiveStart);
  const endDate = new Date(effectiveEnd);

  const items = mode === "last24h"
    ? groupByHour(rows, startDate, endDate)
    : groupByDay(rows, startDate, endDate);

  return { mode, items };
};

/**
 * Get referrer source breakdown for a link within a date range.
 */
export const getReferrersAnalytics = async (
  shortCode: string,
  start: string,
  end: string,
): Promise<ReferrerItem[]> => {
  const referrers = await getReferrersRepo(shortCode, start, end);

  return referrers.map((r) => ({
    referrer: r.referrer || "Direct",
    clicks: r._count.referrer,
  }));
};

/**
 * Get country breakdown for a link within a date range.
 */
export const getCountriesAnalytics = async (
  shortCode: string,
  start: string,
  end: string,
): Promise<BreakdownItem[]> => {
  const rows = await getCountriesRepo(shortCode, start, end);

  return rows.map((row) => ({
    label: row.label,
    clicks: Number(row.clicks),
  }));
};

/**
 * Get device/browser/OS breakdown for a link within a date range.
 */
export const getDevicesAnalytics = async (
  shortCode: string,
  start: string,
  end: string,
): Promise<DeviceBreakdownResult> => {
  const rows = await getDevicesRepo(shortCode, start, end);

  const result: DeviceBreakdownResult = {
    deviceTypes: [],
    browsers: [],
    osList: [],
  };

  for (const row of rows) {
    const item: BreakdownItem = { label: row.label, clicks: Number(row.clicks) };
    if (row.dimension === "device") result.deviceTypes.push(item);
    else if (row.dimension === "browser") result.browsers.push(item);
    else if (row.dimension === "os") result.osList.push(item);
  }

  return result;
};

/**
 * Get top-performing links for a user within a date range.
 */
export const getTopLinksAnalytics = async (
  userId: number,
  start: string,
  end: string,
): Promise<TopLinkItem[]> => {
  const rows = await getTopLinksRepo(userId, start, end);

  return rows.map((row) => ({
    shortCode: row.short_code,
    longUrl: row.long_url,
    clicks: Number(row.clicks),
  }));
};

// ----------------------------------------------------------------
// Preserved functions
// ----------------------------------------------------------------

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
 * Get paginated click logs for a link.
 */
export const getClickLogs = async (
  shortCode: string,
  page: number = 1,
  pageSize: number = 50,
): Promise<ClickLogsResult> => {
  const take = pageSize;
  const skip = (Math.max(1, page) - 1) * pageSize;

  const [rows, total] = await getClickLogsRepo(shortCode, take, skip);

  const formatted = rows.map((r) => ({
    id: typeof r.id === "bigint" ? r.id.toString() : String(r.id),
    urlMappingId:
      typeof r.url_mapping_id === "bigint"
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
