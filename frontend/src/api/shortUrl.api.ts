import { axiosClient } from "../config/axiosClient";
import type { LinkItem, ShortenResponse } from "../types/url.type";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

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
