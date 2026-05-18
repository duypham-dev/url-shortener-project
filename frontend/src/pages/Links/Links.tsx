import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

// Hooks
import { useLinks } from "./hooks/useLinks";
import { useLinkFilters } from "../../hooks/useLinkFilters";
import { bulkUpdateLinksStatus } from "../../api/link.api";

// Components
import LinksPageHeader from "./components/LinksPageHeader";
import LinksFilterToolbar from "./components/LinksFilterToolbar";
import LinksSecondaryToolbar from "./components/LinksSecondaryToolbar";
import LinksListCanvas from "./components/LinksListCanvas";
import { ConfirmModal } from "../../components/ConfirmModal";

export const Links: React.FC = () => {
  const navigate = useNavigate();

  const filters = useLinkFilters();

  const { links, isLoading, error, fetchLinks } = useLinks(filters.queryParams);

  const [selectedShortCodes, setSelectedShortCodes] = useState<string[]>([]);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; isActive: boolean } | null>(null);

  const handleToggleSelect = useCallback((shortCode: string) => {
    setSelectedShortCodes(prev =>
      prev.includes(shortCode) ? prev.filter(c => c !== shortCode) : [...prev, shortCode]
    );
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedShortCodes.length === links.length && links.length > 0) {
      setSelectedShortCodes([]);
    } else {
      setSelectedShortCodes(links.map(l => l.short_code));
    }
  }, [links, selectedShortCodes]);

  const handleBulkStatusUpdate = useCallback((isActive: boolean) => {
    if (selectedShortCodes.length === 0) return;
    setConfirmModal({ isOpen: true, isActive });
  }, [selectedShortCodes]);

  const executeBulkStatusUpdate = useCallback(async () => {
    if (!confirmModal || selectedShortCodes.length === 0) return;
    try {
      await bulkUpdateLinksStatus(selectedShortCodes, confirmModal.isActive);
      setSelectedShortCodes([]);
      await fetchLinks(true);
    } catch (err) {
      console.error("Failed to bulk update links", err);
    }
  }, [selectedShortCodes, fetchLinks, confirmModal]);

  const handleCreateLink = useCallback(() => {
    navigate("/dashboard/links/create");
  }, [navigate]);

  return (
    <div className="w-full max-w-6xl mx-auto py-2 font-sans text-gray-900 pb-20">
      <LinksPageHeader onCreateLink={handleCreateLink} />

      <LinksFilterToolbar
        searchTerm={filters.draftSearchTerm}
        onSearchTermChange={filters.handleSearchTermChange}
        onSearchSubmit={filters.handleSearchSubmit}
        dateFilter={filters.dateFilter}
        onDateFilterChange={filters.handleDateFilterChange}
        linkFilters={filters.linkFilters}
        onLinkFiltersChange={filters.handleLinkFiltersChange}
        sortFilter={filters.sortFilter}
        onSortChange={filters.handleSortChange}
        viewMode={filters.viewMode}
        onViewModeChange={filters.handleViewModeChange}
        hasActiveFilters={filters.hasActiveFilters}
        onClearAllFilters={filters.handleClearAllFilters}
      />

      <LinksSecondaryToolbar 
        selectedCount={selectedShortCodes.length}
        onToggleSelectAll={handleToggleSelectAll}
        isAllSelected={selectedShortCodes.length > 0 && selectedShortCodes.length === links.length}
        isActiveFilter={filters.isActive}
        onIsActiveFilterChange={filters.handleIsActiveChange}
        onBulkUpdateStatus={handleBulkStatusUpdate}
      />

      <LinksListCanvas
        links={links}
        isLoading={isLoading}
        error={error}
        viewMode={filters.viewMode}
        selectedShortCodes={selectedShortCodes}
        onToggleSelect={handleToggleSelect}
      />

      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          onConfirm={executeBulkStatusUpdate}
          title={
            confirmModal.isActive
              ? `Restore ${selectedShortCodes.length} link${selectedShortCodes.length > 1 ? "s" : ""}`
              : `Hide ${selectedShortCodes.length} link${selectedShortCodes.length > 1 ? "s" : ""}`
          }
          message={
            confirmModal.isActive
              ? "Are you sure you want to restore the selected links? This action can be undone any time."
              : "Are you sure you want to hide the selected links? This action can be undone any time."
          }
          confirmText={confirmModal.isActive ? "Restore link" : "Hide link"}
        />
      )}
    </div>
  );
};

export default Links;