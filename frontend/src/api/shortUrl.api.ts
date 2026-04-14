import { axiosClient } from "../config/axiosClient";
import type { ShortenResponse, LinkItem } from "../types/url.type";

export const fetchShortenData = async (): Promise<ShortenResponse> => {
  try {
    const response = await axiosClient.get("/shorten");
    console.log(response.data);
    return response.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const createShortenUrl = async (
  originalUrl: string
): Promise<ShortenResponse> => {
  try {
    const response = await axiosClient.post("/shorten", {
      originalUrl,
    });
    return response.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const getUserLinks = async (): Promise<LinkItem[]> => {
  try {
    const response = await axiosClient.get("/links");
    return response?.data || [];
  } catch (err) {
    console.error(err);
    throw err;
  }
};