import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { DateFilter, LinkFilters, LinksQueryParams, SortFilter } from "../types/filter.type";
import { INITIAL_LINK_FILTERS } from "../types/filter.type";
import { format, parse, isValid } from 'date-fns';

const safeParseDate = (dateStr: string | null) => {
  if (!dateStr) return null;
  const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
};

export const useLinkFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const searchParam = searchParams.get("search") || "";
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const sortByParam = searchParams.get("sortBy") || "createdAt";
  const sortOrderParam = searchParams.get("sortOrder") || "desc";
  const pageParam = searchParams.get("page") || 1;
  const limitParam = searchParams.get("limit") || 10;

  const dateFilter: DateFilter = useMemo(() => ({
    startDate: safeParseDate(startDateParam),
    endDate: safeParseDate(endDateParam),
  }), [startDateParam, endDateParam]);

  const hasActiveFilters = !!searchParam || !!startDateParam || !!endDateParam;

  // Link filters placeholder
  const linkFilters: LinkFilters = INITIAL_LINK_FILTERS;

  // Local state for search input
  const [draftSearchTerm, setDraftSearchTerm] = useState(searchParam);

  // Sync draft if URL changes externally
  useEffect(() => {
    setDraftSearchTerm(searchParam);
  }, [searchParam]);

  const sortFilter: SortFilter = useMemo(() => ({
    sortBy: sortByParam,
    sortOrder: sortOrderParam,
  }), [sortByParam, sortOrderParam]);

  const queryParams: LinksQueryParams = useMemo(() => ({
    search: searchParam,
    dateFilter,
    linkFilters,
    sortFilter,
    page: Number(pageParam),
    limit: Number(limitParam),
  }), [searchParam, dateFilter, linkFilters, sortFilter, pageParam, limitParam]);

  const handleSearchTermChange = useCallback((value: string) => {
    setDraftSearchTerm(value);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (draftSearchTerm) next.set("search", draftSearchTerm);
      else next.delete("search");
      return next;
    });
  }, [draftSearchTerm, setSearchParams]);

  const handleDateFilterChange = useCallback((filter: DateFilter) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);

      // Use format of date-fns instead of toISOString()
      if (filter.startDate) {
        next.set("startDate", format(filter.startDate, 'yyyy-MM-dd'));
      } else {
        next.delete("startDate");
      }

      if (filter.endDate) {
        next.set("endDate", format(filter.endDate, 'yyyy-MM-dd'));
      } else {
        next.delete("endDate");
      }

      return next;
    });
  }, [setSearchParams]);

  const handleLinkFiltersChange = useCallback((_filter: LinkFilters) => {
    // Note: Link filters are not synced to URL yet as backend doesn't support them fully
  }, []);

  const handleSortChange = useCallback((filter: SortFilter) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("sortBy", filter.sortBy);
      next.set("sortOrder", filter.sortOrder);
      next.set("page", "1");
      return next;
    });
  }, [setSearchParams]);

  const handleClearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
    setDraftSearchTerm("");
  }, [setSearchParams]);

  // Return all what UI needs
  return {
    draftSearchTerm,
    dateFilter,
    linkFilters,
    sortFilter,
    hasActiveFilters,
    queryParams,
    handleSearchTermChange,
    handleSearchSubmit,
    handleDateFilterChange,
    handleLinkFiltersChange,
    handleSortChange,
    handleClearAllFilters
  };
};