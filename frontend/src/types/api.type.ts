/**
 * Shared API response envelope type.
 * Previously duplicated identically in payment.api.ts, shortUrl.api.ts, and subscription.api.ts.
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}
