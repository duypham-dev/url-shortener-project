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
}

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
