// frontend/src/hooks/useQrCodes.ts
// Mirrors useLinks.ts exactly but for QR codes.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { QrCodeItem, QrCodesQueryParams } from "../types/qr.type";
import { getUserQrCodes } from "../api/qrCode.api";

interface UseQrCodesReturn {
  qrCodes: QrCodeItem[];
  isLoading: boolean;
  error: string | null;
  fetchQrCodes: (force?: boolean) => Promise<void>;
}

const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

export function useQrCodes(params?: QrCodesQueryParams): UseQrCodesReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<QrCodeItem[], Error>({
    queryKey: ["userQrCodes", params],
    queryFn: async () => {
      return await getUserQrCodes(params);
    },
    staleTime: DEFAULT_STALE_TIME_MS,
  });

  const fetchQrCodes = async (force: boolean = false) => {
    if (force) {
      await queryClient.invalidateQueries({ queryKey: ["userQrCodes"] });
    } else {
      await refetch();
    }
  };

  return {
    qrCodes: data ?? [],
    isLoading,
    error: error ? error.message : null,
    fetchQrCodes,
  };
}
