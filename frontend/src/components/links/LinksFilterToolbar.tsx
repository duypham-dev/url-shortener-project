import React from "react";
import { Filter, Search } from "lucide-react";
import DisplaySettings from "./DisplaySettings";
import DateFilterPopover from "../DateFilterPopover";
import FilterPopover from "../FilterPopover";

interface LinksFilterToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

const LinksFilterToolbarComponent: React.FC<LinksFilterToolbarProps> = ({
  searchTerm,
  onSearchTermChange,
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
        />
      </div>
      <DateFilterPopover />
      <FilterPopover />
      <DisplaySettings />
    </div>
  );
};

export const LinksFilterToolbar = React.memo(LinksFilterToolbarComponent);

export default LinksFilterToolbar;
