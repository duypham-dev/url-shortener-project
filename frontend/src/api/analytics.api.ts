import { axiosClient } from "../config/axiosClient";
import type { ApiEnvelope } from "../types/api.type";
import type { LinkAnalyticsData } from "../types/analytics.type";

export const getLinkAnalytics = async (
  shortCode: string,
): Promise<LinkAnalyticsData> => {
  const response = (await axiosClient.get(
    `/links/${shortCode}/analytics`,
  )) as ApiEnvelope<LinkAnalyticsData>;

  return response.data;
};
