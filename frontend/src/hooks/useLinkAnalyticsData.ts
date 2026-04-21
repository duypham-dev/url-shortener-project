import { useEffect, useState } from "react";
import { getLinkAnalytics } from "../api/analytics.api";
import { getLinkInfo } from "../api/shortUrl.api";
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

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const LINK_INFO_STALE_TIME_MS = 30_000;
const ANALYTICS_STALE_TIME_MS = 20_000;

const linkInfoCache = new Map<string, CacheEntry<LinkItem>>();
const analyticsCache = new Map<string, CacheEntry<LinkAnalyticsData>>();
const linkInfoInFlight = new Map<string, Promise<LinkItem>>();
const analyticsInFlight = new Map<string, Promise<LinkAnalyticsData>>();

const isCacheFresh = <T>(
  entry: CacheEntry<T> | undefined,
  staleTimeMs: number,
): entry is CacheEntry<T> => {
  if (!entry) {
    return false;
  }

  return Date.now() - entry.fetchedAt < staleTimeMs;
};

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

const loadLinkInfo = async (shortCode: string): Promise<LinkItem> => {
  const cached = linkInfoCache.get(shortCode);
  if (isCacheFresh(cached, LINK_INFO_STALE_TIME_MS)) {
    return cached.data;
  }

  const pending = linkInfoInFlight.get(shortCode);
  if (pending) {
    return pending;
  }

  const request = getLinkInfo(shortCode)
    .then((data) => {
      linkInfoCache.set(shortCode, {
        data,
        fetchedAt: Date.now(),
      });
      return data;
    })
    .finally(() => {
      linkInfoInFlight.delete(shortCode);
    });

  linkInfoInFlight.set(shortCode, request);
  return request;
};

const loadAnalytics = async (shortCode: string): Promise<LinkAnalyticsData> => {
  const cached = analyticsCache.get(shortCode);
  if (isCacheFresh(cached, ANALYTICS_STALE_TIME_MS)) {
    return cached.data;
  }

  const pending = analyticsInFlight.get(shortCode);
  if (pending) {
    return pending;
  }

  const request = getLinkAnalytics(shortCode)
    .then((data) => {
      analyticsCache.set(shortCode, {
        data,
        fetchedAt: Date.now(),
      });
      return data;
    })
    .finally(() => {
      analyticsInFlight.delete(shortCode);
    });

  analyticsInFlight.set(shortCode, request);
  return request;
};

export const invalidateLinkAnalyticsCache = (shortCode?: string): void => {
  if (!shortCode) {
    linkInfoCache.clear();
    analyticsCache.clear();
    return;
  }

  linkInfoCache.delete(shortCode);
  analyticsCache.delete(shortCode);
};

export const useLinkAnalyticsData = ({
  shortCode,
  isVip,
  isPlanLoaded,
}: UseLinkAnalyticsDataOptions): UseLinkAnalyticsDataResult => {
  const [link, setLink] = useState<LinkItem | null>(null);
  const [analytics, setAnalytics] = useState<LinkAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlanGated, setIsPlanGated] = useState(false);

  useEffect(() => {
    if (!shortCode) {
      setLink(null);
      setAnalytics(null);
      setError(null);
      setIsPlanGated(false);
      setIsLoading(false);
      return;
    }

    if (!isPlanLoaded) {
      setIsLoading(true);
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      setIsPlanGated(false);

      try {
        const linkData = await loadLinkInfo(shortCode);
        if (isCancelled) {
          return;
        }

        setLink(linkData);

        if (!isVip) {
          setAnalytics(null);
          setIsPlanGated(true);
          return;
        }

        const analyticsData = await loadAnalytics(shortCode);
        if (isCancelled) {
          return;
        }

        setAnalytics(analyticsData);
      } catch (err: unknown) {
        if (isCancelled) {
          return;
        }

        if (isPlanRequiredError(err)) {
          setIsPlanGated(true);
          setAnalytics(null);
          return;
        }

        setError(getAnalyticsErrorMessage(err));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [shortCode, isVip, isPlanLoaded]);

  return {
    link,
    analytics,
    isLoading,
    error,
    isPlanGated,
  };
};
