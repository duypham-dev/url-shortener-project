export interface ShortenResponse {
  originalUrl: string;
  shortUrl: string;
  createdAt: string;
}

export interface LinkItem {
  id: string;
  short_code: string;
  long_url: string;
  title: string | null;
  created_at: string;
  click_count: number;
  has_qr: boolean;
}
