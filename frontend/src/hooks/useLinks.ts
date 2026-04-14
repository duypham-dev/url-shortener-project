import { useState, useEffect } from "react";
import type { LinkItem } from "../types/url.type";
import { getUserLinks } from "../api/shortUrl.api";

interface UseLinksReturn {
  links: LinkItem[];
  isLoading: boolean;
  error: string | null;
  fetchLinks: () => Promise<void>;
}

export function useLinks(): UseLinksReturn {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserLinks();
      setLinks(data);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch links");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  return { links, isLoading, error, fetchLinks };
}
