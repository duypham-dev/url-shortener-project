import { axiosClient } from "../config/axiosClient";
import type { ApiEnvelope } from "../types/api.type";
import type { LinkItem, ShortenResponse } from "../types/url.type";
import type { LinksQueryParams } from "../types/filter.type";

export const createShortenUrl = async (
  originalUrl: string,
): Promise<ShortenResponse> => {
  const response = (await axiosClient.post("/shorten", {
    originalUrl,
  })) as ApiEnvelope<ShortenResponse>;

  return response.data;
};

export const getUserLinks = async (params?: LinksQueryParams): Promise<LinkItem[]> => {
  const query: Record<string, string> = {};
  if (params?.search) {
    query.search = params.search;
  }
  if (params?.dateFilter?.startDate) {
    query.startDate = params.dateFilter.startDate.toISOString();
  }
  if (params?.dateFilter?.endDate) {
    const end = new Date(params.dateFilter.endDate);
    end.setHours(23, 59, 59, 999);
    query.endDate = end.toISOString();
  }

  const response = (await axiosClient.get("/links", { params: query })) as ApiEnvelope<LinkItem[]>;
  return response.data || [];
};

export const getLinkInfo = async (shortCode: string): Promise<LinkItem> => {
  const response = (await axiosClient.get(`/links/${shortCode}`)) as ApiEnvelope<LinkItem>;
  return response.data;
};
