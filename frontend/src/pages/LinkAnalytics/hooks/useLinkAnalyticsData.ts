import { useQuery } from "@tanstack/react-query";
import {
  getLinkAnalyticsTimeseries,
  getLinkAnalyticsReferrers,
  getLinkAnalyticsCountries,
  getLinkAnalyticsDevices,
} from "../../../api/analytics.api";
import { getLinkInfo } from "../../../api/link.api";
import type {
  TimeseriesResult,
  ReferrerItem,
  AnalyticsBreakdownItem,
  DeviceBreakdown,
  AnalyticsQueryParams,
} from "../../../types/analytics.type";
import type { LinkItem } from "../../../types/url.type";

interface UseLinkAnalyticsDataOptions {
  shortCode?: string;
  isVip: boolean;
  isPlanLoaded: boolean;
  /** Filter params passed to all analytics API calls */
  filterParams?: AnalyticsQueryParams;
}

interface UseLinkAnalyticsDataResult {
  link: LinkItem | null;
  timeseries: TimeseriesResult | null;
  referrers: ReferrerItem[] | null;
  countries: AnalyticsBreakdownItem[] | null;
  devices: DeviceBreakdown | null;
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

const retryFn = (failureCount: number, error: unknown): boolean => {
  if (isPlanRequiredError(error)) return false;
  return failureCount < 3;
};

export const useLinkAnalyticsData = ({
  shortCode,
  isVip,
  isPlanLoaded,
  filterParams,
}: UseLinkAnalyticsDataOptions): UseLinkAnalyticsDataResult => {
  // ---- Link info query ----
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

  const analyticsEnabled = !!shortCode && isPlanLoaded && isVip && !!linkData;

  // ---- Timeseries query ----
  const {
    data: timeseriesData,
    error: timeseriesError,
  } = useQuery<TimeseriesResult, unknown>({
    queryKey: ["linkAnalytics", shortCode, "timeseries", filterParams],
    queryFn: () => getLinkAnalyticsTimeseries(shortCode!, filterParams),
    enabled: analyticsEnabled,
    staleTime: ANALYTICS_STALE_TIME_MS,
    retry: retryFn,
  });

  // ---- Referrers query ----
  const {
    data: referrersData,
    error: referrersError,
  } = useQuery<ReferrerItem[], unknown>({
    queryKey: ["linkAnalytics", shortCode, "referrers", filterParams],
    queryFn: () => getLinkAnalyticsReferrers(shortCode!, filterParams),
    enabled: analyticsEnabled,
    staleTime: ANALYTICS_STALE_TIME_MS,
    retry: retryFn,
  });

  // ---- Countries query ----
  const {
    data: countriesData,
    error: countriesError,
  } = useQuery<AnalyticsBreakdownItem[], unknown>({
    queryKey: ["linkAnalytics", shortCode, "countries", filterParams],
    queryFn: () => getLinkAnalyticsCountries(shortCode!, filterParams),
    enabled: analyticsEnabled,
    staleTime: ANALYTICS_STALE_TIME_MS,
    retry: retryFn,
  });

  // ---- Devices query ----
  const {
    data: devicesData,
    error: devicesError,
  } = useQuery<DeviceBreakdown, unknown>({
    queryKey: ["linkAnalytics", shortCode, "devices", filterParams],
    queryFn: () => getLinkAnalyticsDevices(shortCode!, filterParams),
    enabled: analyticsEnabled,
    staleTime: ANALYTICS_STALE_TIME_MS,
    retry: retryFn,
  });

  // ---- Derived state ----
  const isLoading = !isPlanLoaded || isLinkLoading;

  // Plan-gated if user is free, or any analytics query returned PLAN_REQUIRED
  const anyPlanError =
    isPlanRequiredError(timeseriesError) ||
    isPlanRequiredError(referrersError) ||
    isPlanRequiredError(countriesError) ||
    isPlanRequiredError(devicesError);

  const isPlanGated = (!isVip && !!linkData) || anyPlanError;

  // Error: show link error first, then analytics errors (skip plan-gated ones)
  let errorMsg: string | null = null;
  if (linkError) {
    errorMsg = linkError.message || "Không thể tải thông tin link.";
  } else if (!isPlanGated) {
    const firstError = timeseriesError || referrersError || countriesError || devicesError;
    if (firstError) {
      errorMsg = getAnalyticsErrorMessage(firstError);
    }
  }

  return {
    link: linkData ?? null,
    timeseries: isPlanGated ? null : (timeseriesData ?? null),
    referrers: isPlanGated ? null : (referrersData ?? null),
    countries: isPlanGated ? null : (countriesData ?? null),
    devices: isPlanGated ? null : (devicesData ?? null),
    isLoading,
    error: errorMsg,
    isPlanGated,
  };
};
