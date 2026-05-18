import { axiosClient } from "../config/axiosClient";
import type { ApiEnvelope } from "../types/api.type";
import type { LinkItem, ShortenResponse } from "../types/url.type";
import type { LinksQueryParams } from "../types/filter.type";
import type { QrCodeItem } from "../types/qr.type";

export interface CreateShortenOptions {
  generateQr?: boolean;
  qrOptions?: {
    fgColor?: string;
    bgColor?: string;
    errorCorrection?: "L" | "M" | "Q" | "H";
  };
  /** Phase 5 — optional custom back-half */
  customAlias?: string;
  /** Phase 4 — optional ISO expiry date string */
  expiresAt?: string | null;
  title?: string;
}

export const createShortenUrl = async (
  originalUrl: string,
  options?: CreateShortenOptions,
): Promise<ShortenResponse & { qrCode?: QrCodeItem }> => {
  const response = (await axiosClient.post("/shorten", {
    originalUrl,
    generateQr: options?.generateQr,
    qrOptions: options?.qrOptions,
    ...(options?.customAlias ? { customAlias: options.customAlias } : {}),
    ...(options?.expiresAt !== undefined ? { expiresAt: options.expiresAt } : {}),
    ...(options?.title ? { title: options.title } : {}),
  })) as ApiEnvelope<ShortenResponse & { qrCode?: QrCodeItem }>;

  return response.data;
};

// get links with filters 
export const getUserLinks = async (params?: LinksQueryParams): Promise<LinkItem[]> => {
  const query: Record<string, string> = {};
  if (params?.search) {
    query.search = params.search;
  }
  if (params?.isActive !== undefined) {
    query.isActive = String(params.isActive);
  }
  if (params?.dateFilter?.startDate) {
    query.startDate = params.dateFilter.startDate.toISOString();
  }
  if (params?.dateFilter?.endDate) {
    const end = new Date(params.dateFilter.endDate);
    end.setHours(23, 59, 59, 999);
    query.endDate = end.toISOString();
  }
  if (params?.sortFilter?.sortBy) {
    query.sortBy = params.sortFilter.sortBy;
  }
  if (params?.sortFilter?.sortOrder) {
    query.sortOrder = params.sortFilter.sortOrder;
  }

  const response = (await axiosClient.get("/links", { params: query })) as ApiEnvelope<LinkItem[]>;
  return response.data || [];
};

// get link info by shortcode
export const getLinkInfo = async (shortCode: string): Promise<LinkItem> => {
  const response = (await axiosClient.get(`/links/${shortCode}`)) as ApiEnvelope<LinkItem>;
  return response.data;
};

export const updateLink = async (
  shortCode: string,
  data: { title?: string },
): Promise<void> => {
  await axiosClient.patch(`/links/${shortCode}`, data);
};

export const bulkUpdateLinksStatus = async (
  shortCodes: string[],
  isActive: boolean,
): Promise<void> => {
  await axiosClient.patch(`/links/bulk-status`, { shortCodes, isActive });
};
