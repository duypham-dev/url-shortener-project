// frontend/src/types/qr.type.ts

export interface QrCodeItem {
  id: string;
  userId: number;
  urlMappingId: string;
  destinationUrl: string;   // tracking URL ({shortUrl}?r=qr)
  displayUrl: string;       // clean URL without ?r=qr (for display)
  shortCode: string | null;
  title: string | null;
  fgColor: string;
  bgColor: string;
  errorCorrection: string;
  size: number;
  scanCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateQrCodeInput {
  urlMappingId: string;
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
  status?: 'active' | 'inactive' | 'all';
}
