// frontend/src/types/qr.type.ts

export interface QrCodeItem {
  id: string;
  userId: number;
  urlMappingId: string | null;
  destinationUrl: string;
  shortCode: string | null;
  title: string | null;
  cloudinaryUrl: string | null;
  fgColor: string;
  bgColor: string;
  errorCorrection: string;
  size: number;
  scanCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateQrCodeInput {
  destinationUrl: string;
  urlMappingId?: string;
  title?: string;
  fgColor?: string;
  bgColor?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  size?: number;
}

export interface RegenerateQrCodeInput {
  fgColor?: string;
  bgColor?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  size?: number;
  title?: string | null;
}

export interface QrCodesQueryParams {
  search?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  urlMappingId?: string;
}
