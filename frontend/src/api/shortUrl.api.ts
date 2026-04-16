import { axiosClient } from "../config/axiosClient";
import type { ApiEnvelope } from "../types/api.type";
import type { LinkItem, ShortenResponse } from "../types/url.type";

export const createShortenUrl = async (
  originalUrl: string,
): Promise<ShortenResponse> => {
  const response = (await axiosClient.post("/shorten", {
    originalUrl,
  })) as ApiEnvelope<ShortenResponse>;

  return response.data;
};

export const getUserLinks = async (): Promise<LinkItem[]> => {
  const response = (await axiosClient.get("/links")) as ApiEnvelope<LinkItem[]>;
  return response.data || [];
};

export const getLinkInfo = async (shortCode: string): Promise<LinkItem> => {
  const response = (await axiosClient.get(`/links/${shortCode}`)) as ApiEnvelope<LinkItem>;
  return response.data;
};
