import React from "react";
import { Search, X } from "lucide-react";
import DisplaySettings from "../../../components/DisplaySettings";
import DateFilterPopover from "../../../components/DateFilterPopover";
import QrStatusFilter from "./QrStatusFilter";
import type { DateFilter, SortFilter } from "../../../types/filter.type";

interface QrFilterToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearchSubmit: () => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  statusFilter: 'active' | 'inactive' | 'all';
  onStatusChange: (status: 'active' | 'inactive' | 'all') => void;
  sortFilter: SortFilter;
  onSortChange: (filter: SortFilter) => void;
  viewMode: 'card' | 'row';
  onViewModeChange: (mode: 'card' | 'row') => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
}

const QrFilterToolbarComponent: React.FC<QrFilterToolbarProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearchSubmit,
  dateFilter,
  onDateFilterChange,
  statusFilter,
  onStatusChange,
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
          placeholder="Search QR codes"
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
      <QrStatusFilter status={statusFilter} onChange={onStatusChange} />
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

export const QrFilterToolbar = React.memo(QrFilterToolbarComponent);

export default QrFilterToolbar;
