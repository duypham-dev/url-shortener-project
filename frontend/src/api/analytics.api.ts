import { axiosClient } from "../config/axiosClient";
import type { ApiEnvelope } from "../types/api.type";
import type {
  TimeseriesResult,
  ReferrerItem,
  AnalyticsBreakdownItem,
  DeviceBreakdown,
  TopLinkItem,
  AnalyticsQueryParams,
} from "../types/analytics.type";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

// ----------------------------------------------------------------
// Helper — build query string params
// ----------------------------------------------------------------

const buildAnalyticsParams = (
  groupBy: string,
  params?: AnalyticsQueryParams,
): Record<string, string> => {
  const qs: Record<string, string> = { groupBy };
  if (params?.start) qs.start = params.start;
  if (params?.end) qs.end = params.end;
  if (params?.timezone) qs.timezone = params.timezone;
  if (params?.mode) qs.mode = params.mode;
  return qs;
};

// ----------------------------------------------------------------
// Granular analytics API functions
// ----------------------------------------------------------------

interface GroupedResponse<T> {
  groupBy: string;
  items: T;
}

/**
 * Fetch click timeseries for a link (hourly or daily based on mode).
 */
export const getLinkAnalyticsTimeseries = async (
  shortCode: string,
  params?: AnalyticsQueryParams,
): Promise<TimeseriesResult> => {
  const response = (await axiosClient.get(
    `/links/${shortCode}/analytics`,
    { params: buildAnalyticsParams("timeseries", params) },
  )) as ApiEnvelope<GroupedResponse<TimeseriesResult>>;

  return response.data.items;
};

/**
 * Fetch referrer breakdown for a link.
 */
export const getLinkAnalyticsReferrers = async (
  shortCode: string,
  params?: AnalyticsQueryParams,
): Promise<ReferrerItem[]> => {
  const response = (await axiosClient.get(
    `/links/${shortCode}/analytics`,
    { params: buildAnalyticsParams("referrers", params) },
  )) as ApiEnvelope<GroupedResponse<ReferrerItem[]>>;

  return response.data.items;
};

/**
 * Fetch country breakdown for a link.
 */
export const getLinkAnalyticsCountries = async (
  shortCode: string,
  params?: AnalyticsQueryParams,
): Promise<AnalyticsBreakdownItem[]> => {
  const response = (await axiosClient.get(
    `/links/${shortCode}/analytics`,
    { params: buildAnalyticsParams("countries", params) },
  )) as ApiEnvelope<GroupedResponse<AnalyticsBreakdownItem[]>>;

  return response.data.items;
};

/**
 * Fetch device/browser/OS breakdown for a link.
 */
export const getLinkAnalyticsDevices = async (
  shortCode: string,
  params?: AnalyticsQueryParams,
): Promise<DeviceBreakdown> => {
  const response = (await axiosClient.get(
    `/links/${shortCode}/analytics`,
    { params: buildAnalyticsParams("devices", params) },
  )) as ApiEnvelope<GroupedResponse<DeviceBreakdown>>;

  return response.data.items;
};

/**
 * Fetch top-performing links for the authenticated user.
 */
export const getLinkAnalyticsTopLinks = async (
  shortCode: string,
  params?: AnalyticsQueryParams,
): Promise<TopLinkItem[]> => {
  const response = (await axiosClient.get(
    `/links/${shortCode}/analytics`,
    { params: buildAnalyticsParams("top_links", params) },
  )) as ApiEnvelope<GroupedResponse<TopLinkItem[]>>;

  return response.data.items;
};

// ----------------------------------------------------------------
// Click stream (preserved)
// ----------------------------------------------------------------

export const createClickStream = (accessToken: string): EventSource => {
  const streamUrl = new URL(`${API_BASE_URL}/clicks/stream`);
  streamUrl.searchParams.set("token", accessToken);

  return new EventSource(streamUrl.toString(), { withCredentials: true });
};
