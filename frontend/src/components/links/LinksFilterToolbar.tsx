import React from "react";
import { Search, X } from "lucide-react";
import DisplaySettings from "./DisplaySettings";
import DateFilterPopover from "../DateFilterPopover";
import FilterPopover from "../FilterPopover";
import type { DateFilter, LinkFilters, SortFilter } from "../../types/filter.type";

interface LinksFilterToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearchSubmit: () => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  linkFilters: LinkFilters;
  onLinkFiltersChange: (filter: LinkFilters) => void;
  sortFilter: SortFilter;
  onSortChange: (filter: SortFilter) => void;
  viewMode: 'card' | 'row';
  onViewModeChange: (mode: 'card' | 'row') => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
}

const LinksFilterToolbarComponent: React.FC<LinksFilterToolbarProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearchSubmit,
  dateFilter,
  onDateFilterChange,
  linkFilters,
  onLinkFiltersChange,
  sortFilter,
  onSortChange,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearAllFilters,
}) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6 p-1 pb-1">
      <div className="relative w-full sm:w-80">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:border-black sm:text-sm text-gray-900 transition-colors"
          placeholder="Search links"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSearchSubmit();
            }
          }}
        />
      </div>
      <DateFilterPopover filter={dateFilter} onFilterChange={onDateFilterChange} />
      <FilterPopover filter={linkFilters} onFilterChange={onLinkFiltersChange} />
      <DisplaySettings 
        sortFilter={sortFilter}
        onSortChange={onSortChange}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />
      {hasActiveFilters && (
        <button
          onClick={onClearAllFilters}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X size={16} />
          Clear filters
        </button>
      )}
    </div>
  );
};

export const LinksFilterToolbar = React.memo(LinksFilterToolbarComponent);

export default LinksFilterToolbar;
