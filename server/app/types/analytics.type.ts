/**
 * analytics.type.ts
 *
 * Shared TypeScript interfaces for the analytics feature.
 * Consumed by controller, service, and repository layers.
 */

// ----------------------------------------------------------------
// groupBy enum values
// ----------------------------------------------------------------
export const ANALYTICS_GROUP_BY_VALUES = [
  "timeseries",
  "referrers",
  "countries",
  "devices",
  "top_links",
] as const;

export type AnalyticsGroupBy = (typeof ANALYTICS_GROUP_BY_VALUES)[number];

// ----------------------------------------------------------------
// Timeseries mode:
//   last24h  — 24 hours back from now, hourly buckets
//   last7d   — 7 days back from now, daily buckets
//   last30d  — 30 days back from now, daily buckets
//   custom   — user-selected date range (max 30 days), daily buckets
// ----------------------------------------------------------------
export const TIMESERIES_MODE_VALUES = ["last24h", "last7d", "last30d", "custom"] as const;
export type TimeseriesMode = (typeof TIMESERIES_MODE_VALUES)[number];

// ----------------------------------------------------------------
// Validated query parameters (after Zod parsing)
// ----------------------------------------------------------------
export interface AnalyticsQueryParams {
  shortCode: string;
  groupBy: AnalyticsGroupBy;
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
  timezone: string; // IANA timezone
  mode: TimeseriesMode; // only used when groupBy === 'timeseries'
}

// ----------------------------------------------------------------
// Per-dimension result shapes
// ----------------------------------------------------------------

/** A single label + click count pair (used by countries, devices, browsers, OS). */
export interface BreakdownItem {
  label: string;
  clicks: number;
}

/**
 * A single timeseries bucket.
 * `bucket` is an ISO date (YYYY-MM-DD) for daily mode,
 * or an ISO datetime (YYYY-MM-DDTHH:00) for hourly mode.
 */
export interface TimeseriesItem {
  bucket: string;
  clicks: number;
}

/** Wrapper returned by the timeseries endpoint, includes mode metadata. */
export interface TimeseriesResult {
  mode: TimeseriesMode;
  items: TimeseriesItem[];
}

/** Referrer source with click count. */
export interface ReferrerItem {
  referrer: string;
  clicks: number;
}

/** Device analytics grouped into three dimensions. */
export interface DeviceBreakdownResult {
  deviceTypes: BreakdownItem[];
  browsers: BreakdownItem[];
  osList: BreakdownItem[];
}

/** Top-performing link for a user. */
export interface TopLinkItem {
  shortCode: string;
  longUrl: string;
  clicks: number;
}

// ----------------------------------------------------------------
// Raw SQL row types (used only in the repository layer)
// ----------------------------------------------------------------

export interface BreakdownRawRow {
  dimension: string;
  label: string;
  clicks: bigint;
}

export interface TopLinkRawRow {
  short_code: string;
  long_url: string;
  clicks: bigint;
}
