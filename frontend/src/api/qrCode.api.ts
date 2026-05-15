// frontend/src/api/qrCode.api.ts
import { axiosClient } from "../config/axiosClient";
import type { ApiEnvelope } from "../types/api.type";
import type {
  QrCodeItem,
  CreateQrCodeInput,
  RegenerateQrCodeInput,
  QrCodesQueryParams,
} from "../types/qr.type";

// ----------------------------------------------------------------
// Create a QR code for an existing short link
// ----------------------------------------------------------------

export const createQrCode = async (
  input: CreateQrCodeInput,
): Promise<QrCodeItem> => {
  const response = (await axiosClient.post("/qr-codes", input)) as ApiEnvelope<QrCodeItem>;
  return response.data;
};

// ----------------------------------------------------------------
// Get paginated list of user's QR codes
// ----------------------------------------------------------------

export const getUserQrCodes = async (
  params?: QrCodesQueryParams,
): Promise<QrCodeItem[]> => {
  const query: Record<string, string> = {};

  if (params?.search) query.search = params.search;

  if (params?.startDate) query.startDate = params.startDate.toISOString();

  if (params?.endDate) {
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);
    query.endDate = end.toISOString();
  }

  if (params?.urlMappingId) query.urlMappingId = params.urlMappingId;

  if (params?.status) query.status = params.status;
  console.log("PARAMS API: ", params?.status)
  const response = (await axiosClient.get("/qr-codes", {
    params: query,
  })) as ApiEnvelope<QrCodeItem[]>;

  return response.data || [];
};

// ----------------------------------------------------------------
// Get a single QR code by ID
// ----------------------------------------------------------------

export const getQrCodeById = async (id: string): Promise<QrCodeItem> => {
  const response = (await axiosClient.get(`/qr-codes/${id}`)) as ApiEnvelope<QrCodeItem>;
  return response.data;
};

// ----------------------------------------------------------------
// Disable / Lock a QR code
// ----------------------------------------------------------------

export const disableQrCode = async (id: string): Promise<void> => {
  await axiosClient.patch(`/qr-codes/${id}/disable`);
};

// ----------------------------------------------------------------
// Enable / Unlock a QR code
// ----------------------------------------------------------------

export const enableQrCode = async (id: string): Promise<void> => {
  await axiosClient.patch(`/qr-codes/${id}/enable`);
};

// ----------------------------------------------------------------
// Regenerate QR code with new visual options
// ----------------------------------------------------------------

export const regenerateQrCode = async (
  id: string,
  options: RegenerateQrCodeInput,
): Promise<QrCodeItem> => {
  const response = (await axiosClient.patch(
    `/qr-codes/${id}/regenerate`,
    options,
  )) as ApiEnvelope<QrCodeItem>;
  return response.data;
};

// ----------------------------------------------------------------
// Get QR code linked to a specific short link
// ----------------------------------------------------------------

export const getQrCodeByShortCode = async (
  shortCode: string,
): Promise<QrCodeItem | null> => {
  const response = (await axiosClient.get(
    `/links/${shortCode}/qr`,
  )) as ApiEnvelope<QrCodeItem | null>;
  return response.data;
};

