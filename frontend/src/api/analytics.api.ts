import { axiosClient } from "../config/axiosClient";
import type { ApiEnvelope } from "../types/api.type";
import type { LinkAnalyticsData } from "../types/analytics.type";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export const getLinkAnalytics = async (
  shortCode: string,
): Promise<LinkAnalyticsData> => {
  const response = (await axiosClient.get(
    `/links/${shortCode}/analytics`,
  )) as ApiEnvelope<LinkAnalyticsData>;

  return response.data;
};

export const createClickStream = (accessToken: string): EventSource => {
  const streamUrl = new URL(`${API_BASE_URL}/clicks/stream`);
  streamUrl.searchParams.set("token", accessToken);

  return new EventSource(streamUrl.toString(), { withCredentials: true });
};
