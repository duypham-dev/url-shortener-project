import { useCallback, useEffect, useRef, useState } from "react";
import type { LinkItem } from "../types/url.type";
import { getUserLinks } from "../api/shortUrl.api";

interface UseLinksOptions {
  staleTimeMs?: number;
}

interface UseLinksReturn {
  links: LinkItem[];
  isLoading: boolean;
  error: string | null;
  fetchLinks: (force?: boolean) => Promise<void>;
}

const DEFAULT_STALE_TIME_MS = 30_000;

type LinksCacheEntry = {
  data: LinkItem[];
  fetchedAt: number;
};

let linksCache: LinksCacheEntry | null = null;
let inFlightRequest: Promise<LinkItem[]> | null = null;

const isCacheFresh = (staleTimeMs: number): boolean => {
  if (!linksCache) {
    return false;
  }

  return Date.now() - linksCache.fetchedAt < staleTimeMs;
};

const fetchLinksWithDedupe = async (
  force: boolean,
  staleTimeMs: number,
): Promise<LinkItem[]> => {
  if (!force && isCacheFresh(staleTimeMs) && linksCache) {
    return linksCache.data;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = getUserLinks()
    .then((data) => {
      linksCache = {
        data,
        fetchedAt: Date.now(),
      };
      return data;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  inFlightRequest = request;
  return request;
};

export const invalidateLinksCache = (): void => {
  linksCache = null;
};

export function useLinks(options: UseLinksOptions = {}): UseLinksReturn {
  const staleTimeMs = options.staleTimeMs ?? DEFAULT_STALE_TIME_MS;
  const [links, setLinks] = useState<LinkItem[]>(() => linksCache?.data ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(() => !linksCache);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchLinks = useCallback(async (force: boolean = false) => {
    if (!force && isCacheFresh(staleTimeMs) && linksCache) {
      setLinks(linksCache.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchLinksWithDedupe(force, staleTimeMs);

      if (!isMountedRef.current) {
        return;
      }

      setLinks(data);
    } catch (err: unknown) {
      if (!isMountedRef.current) {
        return;
      }

      const message = err instanceof Error ? err.message : "Failed to fetch links";
      setError(message);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [staleTimeMs]);

  useEffect(() => {
    void fetchLinks(false);
  }, [fetchLinks]);

  return { links, isLoading, error, fetchLinks };
}
