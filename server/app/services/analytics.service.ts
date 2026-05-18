/**
 * analytics.service.ts
 *
 * Service layer for link click analytics.
 * Each function targets a single analytics dimension, called by the controller
 * based on the `groupBy` query parameter.
 *
 * Timeseries aggregation is done in PostgreSQL (DATE_TRUNC) — NOT in Node.js.
 * Zero-filling empty buckets is the only in-memory work remaining.
 */
import {
  getTimeseriesHourlyRepo,
  getTimeseriesDailyRepo,
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
// Date range resolution — single source of truth for all dimensions
// ----------------------------------------------------------------

export interface ResolvedDateRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

/**
 * Resolve start/end dates from the mode.
 *
 * - last24h: exactly 24 hours back from now
 * - last7d:  7 calendar days back from start-of-today (UTC)
 * - last30d: 30 calendar days back from start-of-today (UTC)
 * - custom:  client-supplied start/end (max 30-day span enforced by schema)
 */
export const resolveAnalyticsDateRange = (
  mode: TimeseriesMode,
  clientStart?: string,
  clientEnd?: string,
): ResolvedDateRange => {
  const now = new Date();

  if (mode === "last24h") {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: now.toISOString() };
  }

  if (mode === "custom" && clientStart && clientEnd) {
    const start = new Date(clientStart);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(clientEnd);
    end.setUTCHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // Preset daily modes (last7d / last30d)
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);

  const daysBack = mode === "last7d" ? 7 : 30;
  const startDate = new Date(now);
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() - (daysBack - 1));

  return { start: startDate.toISOString(), end: endOfToday.toISOString() };
};

// ----------------------------------------------------------------
// Zero-fill — insert 0s for buckets missing from the DB result
// ----------------------------------------------------------------

/**
 * Format a Date to a timeseries bucket key string.
 * hourly: "YYYY-MM-DDTHH:00"  |  daily: "YYYY-MM-DD"
 */
const formatBucket = (d: Date, mode: "hourly" | "daily"): string => {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  if (mode === "daily") return `${yyyy}-${mm}-${dd}`;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:00`;
};

/**
 * Zero-fill sparse DB results with all expected buckets in the date range.
 */
const zeroFill = (
  dbRows: { bucket: Date; clicks: bigint }[],
  start: Date,
  end: Date,
  mode: "hourly" | "daily",
): TimeseriesItem[] => {
  // Build a lookup map from pre-aggregated DB rows
  const counts = new Map<string, number>();
  for (const row of dbRows) {
    counts.set(formatBucket(row.bucket, mode), Number(row.clicks));
  }

  // Walk the full time range step-by-step and emit every bucket
  const result: TimeseriesItem[] = [];
  const cursor = new Date(start);

  if (mode === "hourly") {
    cursor.setUTCMinutes(0, 0, 0);
    while (cursor <= end) {
      const bucket = formatBucket(cursor, "hourly");
      result.push({ bucket, clicks: counts.get(bucket) ?? 0 });
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }
  } else {
    cursor.setUTCHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setUTCHours(23, 59, 59, 999);
    while (cursor <= endDay) {
      const bucket = formatBucket(cursor, "daily");
      result.push({ bucket, clicks: counts.get(bucket) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return result;
};

// ----------------------------------------------------------------
// Per-dimension analytics
// ----------------------------------------------------------------

/** Shared input for all analytics queries */
export interface AnalyticsDateInput {
  mode: TimeseriesMode;
  clientStart?: string | undefined;
  clientEnd?: string | undefined;
}

/**
 * Get click timeseries for a link.
 * Aggregation is performed in PostgreSQL — zero-filling is the only Node.js work.
 */
export const getTimeseriesAnalytics = async (
  shortCode: string,
  input: AnalyticsDateInput,
): Promise<TimeseriesResult> => {
  const { start, end } = resolveAnalyticsDateRange(input.mode, input.clientStart, input.clientEnd);
  const isHourly = input.mode === "last24h";

  const dbRows = isHourly
    ? await getTimeseriesHourlyRepo(shortCode, start, end)
    : await getTimeseriesDailyRepo(shortCode, start, end);

  const items = zeroFill(dbRows, new Date(start), new Date(end), isHourly ? "hourly" : "daily");
  return { mode: input.mode, items };
};

/**
 * Get referrer source breakdown for a link.
 */
export const getReferrersAnalytics = async (
  shortCode: string,
  input: AnalyticsDateInput,
): Promise<ReferrerItem[]> => {
  const { start, end } = resolveAnalyticsDateRange(input.mode, input.clientStart, input.clientEnd);
  const referrers = await getReferrersRepo(shortCode, start, end);

  return referrers.map((r) => ({
    referrer: r.referrer || "Direct",
    clicks: r._count.referrer,
  }));
};

/**
 * Get country breakdown for a link.
 */
export const getCountriesAnalytics = async (
  shortCode: string,
  input: AnalyticsDateInput,
): Promise<BreakdownItem[]> => {
  const { start, end } = resolveAnalyticsDateRange(input.mode, input.clientStart, input.clientEnd);
  const rows = await getCountriesRepo(shortCode, start, end);

  return rows.map((row) => ({
    label: row.label,
    clicks: Number(row.clicks),
  }));
};

/**
 * Get device/browser/OS breakdown for a link.
 */
export const getDevicesAnalytics = async (
  shortCode: string,
  input: AnalyticsDateInput,
): Promise<DeviceBreakdownResult> => {
  const { start, end } = resolveAnalyticsDateRange(input.mode, input.clientStart, input.clientEnd);
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
 * Get top-performing links for a user.
 */
export const getTopLinksAnalytics = async (
  userId: number,
  input: AnalyticsDateInput,
): Promise<TopLinkItem[]> => {
  const { start, end } = resolveAnalyticsDateRange(input.mode, input.clientStart, input.clientEnd);
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
