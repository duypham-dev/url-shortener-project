import React, { useState } from "react";
import { LinkCard } from "../components/LinkCard";
import { useLinks } from "../hooks/useLinks";
import {
  Search,
  Calendar,
  Filter,
  Lock,
  List,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";


export const Links: React.FC = () => {
  const { links, isLoading, error } = useLinks();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="w-full max-w-6xl mx-auto py-2 font-sans text-gray-900 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Bitly Links
        </h1>
        <button className="bg-[#0f34a3] hover:bg-[#0c2a86] text-white font-medium py-2 px-5 rounded-md transition-colors shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-blue-600">
          Create link
        </button>
      </div>

      {/* Toolbar - Search & Filters */}
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
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm shadow-black/5">
          <Calendar size={16} strokeWidth={2.5} className="text-gray-500" />
          Filter by created date
        </button>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm shadow-black/5">
          <Filter size={16} strokeWidth={2.5} className="text-gray-500" />
          Add filters
        </button>
      </div>

      {/* Secondary Toolbar (Bulk Actions & View Options) */}
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
            <button className="flex items-center gap-1.5 cursor-not-allowed hover:text-gray-500 transition-colors">
              <Lock size={14} />
              Export
            </button>
            <button className="flex items-center gap-1.5 text-gray-400 cursor-not-allowed hover:text-gray-500 transition-colors">
              Hide
            </button>
            <button className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors">
              Tag
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-600">
          {/* View Toggles */}
          <div className="flex bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden shrink-0">
            <button
              className="p-1.5 px-3 bg-gray-100 text-gray-900 border-r border-gray-200 transition-colors"
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              className="p-1.5 px-3 bg-white text-gray-400 hover:bg-gray-50 transition-colors"
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-300"></div>

          {/* Active filter toggle */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors text-sm font-bold text-gray-800 shadow-sm shrink-0 leading-none">
            Show: Active
            <ChevronDown size={16} strokeWidth={2.5} className="ml-1 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Main List Canvas */}
      <div className="space-y-4 relative bg-gray-50 pt-4 p-4 min-h-screen">
        
        {/* Mock Promo Banner */}
        <div className="bg-[#eafafa] text-[#0f34a3] px-4 py-3 rounded-md text-sm font-medium flex-wrap flex items-center gap-2 mb-4">
          <span className="text-teal-500 font-bold ml-1 mr-1">✦</span>
          Change a link's destination, even after you've shared it. Get redirects with every plan.
          <a href="#" className="underline hover:text-blue-800 ml-1">View plans</a>
        </div>

        {isLoading && (
          <div className="py-20 flex justify-center text-gray-400">Loading links...</div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {!isLoading && !error && links.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            No links found. Try creating one!
          </div>
        )}

        {links
          .filter(
            (link) =>
              link.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              link.long_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
              link.short_code.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((link) => (
            <LinkCard key={link.short_code} link={link} />
          ))}
      </div>
    </div>
  );
};

export default Links;
