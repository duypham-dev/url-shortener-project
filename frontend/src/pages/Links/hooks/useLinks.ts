import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LinkItem } from "../../../types/url.type";
import { getUserLinks } from "../../../api/link.api";
import type { LinksQueryParams } from "../../../types/filter.type";


interface UseLinksReturn {
  links: LinkItem[];
  isLoading: boolean;
  error: string | null;
  fetchLinks: (force?: boolean) => Promise<void>;
}

const DEFAULT_STALE_TIME_MS = 1 * 60 * 1000; // 5 minutes

export function useLinks(params: LinksQueryParams): UseLinksReturn {
  const staleTimeMs = DEFAULT_STALE_TIME_MS;
  const queryClient = useQueryClient();
  console.log("useLinks: ", params)
  const { data, isLoading, error, refetch } = useQuery<LinkItem[], Error>({
    queryKey: ['userLinks', params], // Include params in the query key for caching
    queryFn: async () => {
      return await getUserLinks(params);
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
