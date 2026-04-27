import React from "react";
import { ChevronDown, LayoutGrid, List, Lock } from "lucide-react";

const LinksSecondaryToolbarComponent: React.FC = () => {
  return (
    <div className="bg-gray-50/80 rounded-t-lg border-b border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-4 mt-8">
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 mt-px border border-gray-300 rounded text-blue-600 focus:ring-blue-500"
          />
          0 selected
        </label>

        <div className="flex items-center gap-5 text-sm font-medium text-gray-400">
          <button
            type="button"
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            Tag
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-gray-600">
        <div className="h-6 w-px bg-gray-300" />

        <button
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors text-sm font-bold text-gray-800 shadow-sm shrink-0 leading-none"
        >
          Show: Active
          <ChevronDown size={16} strokeWidth={2.5} className="ml-1 text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export const LinksSecondaryToolbar = React.memo(LinksSecondaryToolbarComponent);

export default LinksSecondaryToolbar;
