// frontend/src/pages/QrCodes.tsx
// Mounted at /dashboard/qr — mirrors Links.tsx structure exactly.
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

// Hooks
import { useQrCodes } from "../hooks/useQrCodes";
import { useQrFilters } from "../hooks/useQrFilters";

// Store
import {
  usePlanStore,
  selectRemainingQrCodes,
  selectCanUseQr,
  selectPlanName,
} from "../store/usePlanStore";

// API
import { deleteQrCode } from "../api/qrCode.api";

// Components
import { QrPageHeader } from "../components/qr/QrPageHeader";
import { QrListCanvas } from "../components/qr/QrListCanvas";
import LinksFilterToolbar from "../components/links/LinksFilterToolbar";
import LinksSecondaryToolbar from "../components/links/LinksSecondaryToolbar";
import PlanGatedOverlay from "../components/PlanGate";

// Types
import type { DateFilter, LinkFilters } from "../types/filter.type";
import { INITIAL_LINK_FILTERS } from "../types/filter.type";

export const QrCodes: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Plan store
  const remainingQrCodes = usePlanStore(selectRemainingQrCodes);
  const canUseQr = usePlanStore(selectCanUseQr);
  const planName = usePlanStore(selectPlanName);
  const isPlanLoading = usePlanStore((s) => s.isLoading);

  // Filters (URL-synced)
  const filters = useQrFilters();

  // Data
  const { qrCodes, isLoading, error } = useQrCodes(filters.queryParams);

  const handleCreateQr = useCallback(() => {
    navigate("/dashboard/qr/create");
  }, [navigate]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Delete this QR code? This cannot be undone.")) return;
      try {
        await deleteQrCode(id);
        queryClient.invalidateQueries({ queryKey: ["userQrCodes"] });
      } catch (err) {
        console.error("Failed to delete QR code", err);
      }
    },
    [queryClient],
  );

  // Plan gate for free-tier users
  if (!isPlanLoading && !canUseQr) {
    return (
      <PlanGatedOverlay
        onBack={() => navigate("/dashboard")}
        onUpgrade={() => navigate("/dashboard/upgrade")}
      />
    );
  }

  // Adapter: QrFilters → LinksFilterToolbar props (toolbar is generic)
  const dateFilter: DateFilter = {
    startDate: filters.dateFilter.startDate,
    endDate: filters.dateFilter.endDate,
  };
  const linkFilters: LinkFilters = INITIAL_LINK_FILTERS;

  return (
    <div className="w-full max-w-6xl mx-auto py-2 font-sans text-gray-900 pb-20">
      <QrPageHeader
        onCreateQr={handleCreateQr}
        remainingQrCodes={remainingQrCodes}
        planName={planName}
        isPlanLoading={isPlanLoading}
      />

      <LinksFilterToolbar
        searchTerm={filters.draftSearchTerm}
        onSearchTermChange={filters.handleSearchTermChange}
        onSearchSubmit={filters.handleSearchSubmit}
        dateFilter={dateFilter}
        onDateFilterChange={filters.handleDateFilterChange}
        linkFilters={linkFilters}
        onLinkFiltersChange={() => {}}
        hasActiveFilters={filters.hasActiveFilters}
        onClearAllFilters={filters.handleClearAllFilters}
      />

      <LinksSecondaryToolbar />

      <QrListCanvas
        qrCodes={qrCodes}
        isLoading={isLoading}
        error={error}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default QrCodes;
