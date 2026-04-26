// ----------------------------------------------------------------
// Shared breakdown item (same shape as backend BreakdownItem)
// ----------------------------------------------------------------
export interface AnalyticsBreakdownItem {
  label: string;
  clicks: number;
}

// ----------------------------------------------------------------
// Per-dimension result types
// ----------------------------------------------------------------

export type TimeseriesMode = "last24h" | "last7d" | "last30d" | "custom";

export interface TimeseriesItem {
  bucket: string;   // "YYYY-MM-DD" (daily) or "YYYY-MM-DDTHH:00" (hourly)
  clicks: number;
}

export interface TimeseriesResult {
  mode: TimeseriesMode;
  items: TimeseriesItem[];
}

export interface ReferrerItem {
  referrer: string;
  clicks: number;
}

export interface DeviceBreakdown {
  deviceTypes: AnalyticsBreakdownItem[];
  browsers: AnalyticsBreakdownItem[];
  osList: AnalyticsBreakdownItem[];
}

export interface TopLinkItem {
  shortCode: string;
  longUrl: string;
  clicks: number;
}

// ----------------------------------------------------------------
// Query params shared by all analytics API functions.
// For presets: only `mode` is needed.
// For custom: `mode`, `start`, and `end` are required.
// ----------------------------------------------------------------
export interface AnalyticsQueryParams {
  mode: TimeseriesMode;
  start?: string;  // ISO date string, required when mode is 'custom'
  end?: string;    // ISO date string, required when mode is 'custom'
}

// ----------------------------------------------------------------
// Legacy monolith type — kept for backward compatibility
// ----------------------------------------------------------------
export interface DailyClickData {
  date: string;    // YYYY-MM-DD
  clicks: number;
}

export interface ReferrerAnalyticsItem {
  referrer: string;
  clicks: number;
}

export interface LinkAnalyticsData {
  shortCode: string;
  totalClicks: number;
  dailyClicks: DailyClickData[];
  referrers: ReferrerAnalyticsItem[];
  deviceBreakdown: AnalyticsBreakdownItem[];
  browserBreakdown: AnalyticsBreakdownItem[];
  osBreakdown: AnalyticsBreakdownItem[];
  countryBreakdown: AnalyticsBreakdownItem[];
}

// ----------------------------------------------------------------
// Click stream (preserved)
// ----------------------------------------------------------------
export interface ClickStreamPayload {
  shortCode: string;
  longUrl: string;
  ip: string;
  userAgent: string;
  referrer: string | null;
  timestamp: string;
  urlMappingId: string;
  userId: number;
  browser: string | null;
  os: string | null;
  deviceType: string;
}
