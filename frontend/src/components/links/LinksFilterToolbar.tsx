import React from "react";
import { Calendar, Filter, Search } from "lucide-react";

interface LinksFilterToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

const LinksFilterToolbarComponent: React.FC<LinksFilterToolbarProps> = ({
  searchTerm,
  onSearchTermChange,
}) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6 bg-white p-1 pb-1">
      <div className="relative w-full sm:w-80">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 transition-colors shadow-sm"
          placeholder="Search links"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
        />
      </div>

      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm shadow-black/5"
      >
        <Calendar size={16} strokeWidth={2.5} className="text-gray-500" />
        Filter by created date
      </button>

      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm shadow-black/5"
      >
        <Filter size={16} strokeWidth={2.5} className="text-gray-500" />
        Add filters
      </button>
    </div>
  );
};

export const LinksFilterToolbar = React.memo(LinksFilterToolbarComponent);

export default LinksFilterToolbar;
