import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

interface LinksSecondaryToolbarProps {
  selectedCount: number;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  isActiveFilter: boolean;
  onIsActiveFilterChange: (active: boolean) => void;
  onBulkUpdateStatus: (isActive: boolean) => void;
}

const LinksSecondaryToolbarComponent: React.FC<LinksSecondaryToolbarProps> = ({
  selectedCount,
  onToggleSelectAll,
  isAllSelected,
  isActiveFilter,
  onIsActiveFilterChange,
  onBulkUpdateStatus,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-gray-50/80 rounded-t-lg border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-4 mt-8">
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            className="w-4 h-4 mt-px border border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          {selectedCount > 0 ? `${selectedCount} selected` : "0 selected"}
        </label>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 text-sm font-bold">
            {isActiveFilter ? (
              <button
                type="button"
                onClick={() => onBulkUpdateStatus(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 rounded transition-all cursor-pointer shadow-sm focus:outline-none"
              >
                <EyeOff size={14} className="stroke-[2.5]" />
                Hide
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onBulkUpdateStatus(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 rounded transition-all cursor-pointer shadow-sm focus:outline-none"
              >
                <Eye size={14} className="stroke-[2.5]" />
                Unhide
              </button>
            )}
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 rounded transition-all cursor-pointer shadow-sm focus:outline-none"
            >
              Tag
            </button>
          </div>
        )}
        {selectedCount === 0 && (
          <div className="flex items-center gap-5 text-sm font-medium text-gray-400">
            <button
              type="button"
              className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              Tag
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-gray-600 relative" ref={dropdownRef}>
        <div className="h-6 w-px bg-gray-300" />

        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors text-sm font-bold text-gray-800 shadow-sm shrink-0 leading-none"
        >
          Show: {isActiveFilter ? "Active" : "Hidden"}
          <ChevronDown size={16} strokeWidth={2.5} className="ml-1 text-gray-500" />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 text-sm font-medium">
            <button
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${isActiveFilter ? "text-blue-600 bg-blue-50/50" : "text-gray-700"}`}
              onClick={() => {
                onIsActiveFilterChange(true);
                setIsDropdownOpen(false);
              }}
            >
              Active
            </button>
            <button
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${!isActiveFilter ? "text-blue-600 bg-blue-50/50" : "text-gray-700"}`}
              onClick={() => {
                onIsActiveFilterChange(false);
                setIsDropdownOpen(false);
              }}
            >
              Hidden
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const LinksSecondaryToolbar = React.memo(LinksSecondaryToolbarComponent);

export default LinksSecondaryToolbar;
