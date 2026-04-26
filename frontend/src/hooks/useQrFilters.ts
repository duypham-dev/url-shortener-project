// frontend/src/hooks/useQrFilters.ts
// Mirrors useLinkFilters.ts exactly for QR codes.
import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format, parse, isValid } from "date-fns";
import type { QrCodesQueryParams } from "../types/qr.type";

export interface DateFilter {
  startDate: Date | null;
  endDate: Date | null;
}

const safeParseDate = (dateStr: string | null) => {
  if (!dateStr) return null;
  const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : null;
};

export const useQrFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read state from URL
  const searchParam = searchParams.get("search") || "";
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const dateFilter: DateFilter = useMemo(
    () => ({
      startDate: safeParseDate(startDateParam),
      endDate: safeParseDate(endDateParam),
    }),
    [startDateParam, endDateParam],
  );

  const hasActiveFilters = !!searchParam || !!startDateParam || !!endDateParam;

  // Local draft for search input (not committed to URL until submit)
  const [draftSearchTerm, setDraftSearchTerm] = useState(searchParam);

  // Sync draft if URL changes externally
  useEffect(() => {
    setDraftSearchTerm(searchParam);
  }, [searchParam]);

  const queryParams: QrCodesQueryParams = useMemo(
    () => ({
      search: searchParam || undefined,
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
    }),
    [searchParam, dateFilter],
  );

  const handleSearchTermChange = useCallback((value: string) => {
    setDraftSearchTerm(value);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (draftSearchTerm) next.set("search", draftSearchTerm);
      else next.delete("search");
      return next;
    });
  }, [draftSearchTerm, setSearchParams]);

  const handleDateFilterChange = useCallback(
    (filter: DateFilter) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (filter.startDate) {
          next.set("startDate", format(filter.startDate, "yyyy-MM-dd"));
        } else {
          next.delete("startDate");
        }
        if (filter.endDate) {
          next.set("endDate", format(filter.endDate, "yyyy-MM-dd"));
        } else {
          next.delete("endDate");
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const handleClearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
    setDraftSearchTerm("");
  }, [setSearchParams]);

  return {
    draftSearchTerm,
    dateFilter,
    hasActiveFilters,
    queryParams,
    handleSearchTermChange,
    handleSearchSubmit,
    handleDateFilterChange,
    handleClearAllFilters,
  };
};
