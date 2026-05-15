// frontend/src/pages/QrCodes.tsx
// Mounted at /dashboard/qr — mirrors Links.tsx structure exactly.
import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

// Hooks
import { useQrCodes } from "./hooks/useQrCodes";
import { useQrFilters } from "./hooks/useQrFilters";

// Store
import {
  usePlanStore,
  selectRemainingQrCodes,
  selectCanUseQr,
  selectPlanName,
} from "../../store/usePlanStore";
import { showConfirmDialog } from "../../store/useConfirmStore";

// API
import { disableQrCode, enableQrCode } from "../../api/qrCode.api";

// Components
import QrPageHeader from "./components/QrPageHeader";
import QrListCanvas from "./components/QrListCanvas";
import QrFilterToolbar from "./components/QrFilterToolbar";
import LinksSecondaryToolbar from "../Links/components/LinksSecondaryToolbar";
import PlanGatedOverlay from "../../components/PlanGate";

// Types
import type { DateFilter } from "../../types/filter.type";

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

  const handleToggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const action = currentStatus ? "disable" : "enable";

      const confirmed = await showConfirmDialog({
        title: `${currentStatus ? 'Disable' : 'Enable'} QR Code`,
        message: `Are you sure you want to ${action} this QR code?`,
        confirmText: `Yes, ${action} it`,
        variant: currentStatus ? 'warning' : 'info',
      });
      if (!confirmed) return;
      try {
        if (currentStatus) {
          await disableQrCode(id);
        } else {
          await enableQrCode(id);
        }
        queryClient.invalidateQueries({ queryKey: ["userQrCodes"] });
      } catch (err) {
        console.error(`Failed to ${action} QR code`, err);
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

  // Adapter: QrFilters → QrFilterToolbar props
  const dateFilter: DateFilter = {
    startDate: filters.dateFilter.startDate,
    endDate: filters.dateFilter.endDate,
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-2 font-sans text-gray-900 pb-20">
      <QrPageHeader
        remainingQrCodes={remainingQrCodes}
        planName={planName}
        isPlanLoading={isPlanLoading}
      />

      <QrFilterToolbar
        searchTerm={filters.draftSearchTerm}
        onSearchTermChange={filters.handleSearchTermChange}
        onSearchSubmit={filters.handleSearchSubmit}
        dateFilter={dateFilter}
        onDateFilterChange={filters.handleDateFilterChange}
        statusFilter={filters.statusFilter}
        onStatusChange={filters.handleStatusChange}
        sortFilter={{ sortBy: 'created_at', sortOrder: 'desc' }}
        onSortChange={() => { }}
        viewMode={filters.viewMode}
        onViewModeChange={filters.handleViewModeChange}
        hasActiveFilters={filters.hasActiveFilters}
        onClearAllFilters={filters.handleClearAllFilters}
      />

      <LinksSecondaryToolbar />

      <QrListCanvas
        qrCodes={qrCodes}
        isLoading={isLoading}
        error={error}
        onDisable={handleToggleActive}
        viewMode={filters.viewMode}
      />
    </div>
  );
};

export default QrCodes;
