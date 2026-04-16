export interface DailyClickData {
  date: string;    // YYYY-MM-DD
  clicks: number;
}

export interface LinkAnalyticsData {
  shortCode: string;
  totalClicks: number;
  dailyClicks: DailyClickData[];
}
