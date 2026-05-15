import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Hooks
import { useLinks } from "./hooks/useLinks";
import { useLinkFilters } from "../../hooks/useLinkFilters";

// Components
import LinksPageHeader from "./components/LinksPageHeader";
import LinksFilterToolbar from "./components/LinksFilterToolbar";
import LinksSecondaryToolbar from "./components/LinksSecondaryToolbar";
import LinksListCanvas from "./components/LinksListCanvas";

export const Links: React.FC = () => {
  const navigate = useNavigate();

  const filters = useLinkFilters();

  const { links, isLoading, error } = useLinks(filters.queryParams);

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

      <LinksSecondaryToolbar />

      <LinksListCanvas
        links={links}
        isLoading={isLoading}
        error={error}
        viewMode={filters.viewMode}
      />
    </div>
  );
};

export default Links;