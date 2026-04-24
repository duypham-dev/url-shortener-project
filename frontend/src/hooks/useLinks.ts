import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

export function useLinks(options: UseLinksOptions = {}): UseLinksReturn {
  const staleTimeMs = options.staleTimeMs ?? DEFAULT_STALE_TIME_MS;
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<LinkItem[], Error>({
    queryKey: ['userLinks'],
    queryFn: async () => {
      return await getUserLinks();
    },
    staleTime: staleTimeMs,
  });

  const fetchLinks = async (force: boolean = false) => {
    if (force) {
      await queryClient.invalidateQueries({ queryKey: ['userLinks'] });
    } else {
      await refetch();
    }
  };

  return {
    links: data ?? [],
    isLoading,
    error: error ? error.message : null,
    fetchLinks,
  };
}
