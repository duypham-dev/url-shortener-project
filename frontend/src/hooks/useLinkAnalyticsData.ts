import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getLinkAnalytics } from "../api/analytics.api";
import { getLinkInfo } from "../api/link.api";
import type { LinkAnalyticsData } from "../types/analytics.type";
import type { LinkItem } from "../types/url.type";

interface UseLinkAnalyticsDataOptions {
  shortCode?: string;
  isVip: boolean;
  isPlanLoaded: boolean;
}

interface UseLinkAnalyticsDataResult {
  link: LinkItem | null;
  analytics: LinkAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  isPlanGated: boolean;
}

type AnalyticsError = {
  code?: string;
  message?: string;
  response?: {
    data?: {
      code?: string;
      message?: string;
    };
  };
};

const LINK_INFO_STALE_TIME_MS = 30_000;
const ANALYTICS_STALE_TIME_MS = 20_000;

const isPlanRequiredError = (value: unknown): boolean => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const error = value as AnalyticsError;
  return error.code === "PLAN_REQUIRED" || error.response?.data?.code === "PLAN_REQUIRED";
};

const getAnalyticsErrorMessage = (value: unknown): string => {
  if (!value || typeof value !== "object") {
    return "Không thể tải dữ liệu phân tích.";
  }

  const error = value as AnalyticsError;
  return error.response?.data?.message || error.message || "Không thể tải dữ liệu phân tích.";
};

export const invalidateLinkAnalyticsCache = (shortCode?: string): void => {
  // Can be implemented similarly using useQueryClient
};

export const useLinkAnalyticsData = ({
  shortCode,
  isVip,
  isPlanLoaded,
}: UseLinkAnalyticsDataOptions): UseLinkAnalyticsDataResult => {
  const {
    data: linkData,
    isLoading: isLinkLoading,
    error: linkError,
  } = useQuery<LinkItem, Error>({
    queryKey: ["linkInfo", shortCode],
    queryFn: () => getLinkInfo(shortCode!),
    enabled: !!shortCode && isPlanLoaded,
    staleTime: LINK_INFO_STALE_TIME_MS,
  });

  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    error: analyticsError,
  } = useQuery<LinkAnalyticsData, unknown>({
    queryKey: ["linkAnalytics", shortCode],
    queryFn: () => getLinkAnalytics(shortCode!),
    enabled: !!shortCode && isPlanLoaded && isVip && !!linkData,
    staleTime: ANALYTICS_STALE_TIME_MS,
    retry: (failureCount, error) => {
      // Don't retry if it's a plan requirement error
      if (isPlanRequiredError(error)) return false;
      return failureCount < 3;
    }
  });

  const isLoading = (!isPlanLoaded) || isLinkLoading || (isVip && isAnalyticsLoading);
  const isPlanGated = (!isVip && !!linkData) || isPlanRequiredError(analyticsError);
  
  let errorMsg: string | null = null;
  if (linkError) {
    errorMsg = linkError.message || "Không thể tải thông tin link.";
  } else if (analyticsError && !isPlanGated) {
    errorMsg = getAnalyticsErrorMessage(analyticsError);
  }

  return {
    link: linkData ?? null,
    analytics: isPlanGated ? null : (analyticsData ?? null),
    isLoading,
    error: errorMsg,
    isPlanGated,
  };
};
