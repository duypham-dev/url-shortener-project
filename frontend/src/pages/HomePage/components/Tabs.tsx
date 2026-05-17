import React from 'react';
import { Link as LinkIcon, BarChart3, Users } from 'lucide-react';

export function Tabs() {
  return (
    <div className="w-full flex justify-center relative z-20">
      <div className="bg-white rounded-b-[2rem] relative px-6 pb-6 pt-2 my-0 shadow-[0_4px_0_0_#F6F8FA] lg:shadow-none">
        
        {/* Left Inverted Corner SVG */}
        <svg
          viewBox="0 0 85 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute top-0 -left-[85px] w-[85px] h-[64px] text-white shrink-0 translate-x-px translate-y-px overflow-visible"
        >
          <rect x="0" y="0" width="85" height="1" fill="currentColor" transform="translate(0, -1)" />
          <path d="M50 45C57.3095 56.6952 71.2084 63.9997 85 64V0H0C13.7915 0 26.6905 7.30481 34 19L50 45Z" fill="currentColor" />
        </svg>

        {/* Right Inverted Corner SVG */}
        <svg
          viewBox="0 0 85 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute top-0 -right-[85px] w-[85px] h-[64px] text-white shrink-0 -translate-x-px translate-y-px -scale-x-100 overflow-visible"
        >
          <rect x="0" y="0" width="85" height="1" fill="currentColor" transform="translate(0, -1)" />
          <path d="M50 45C57.3095 56.6952 71.2084 63.9997 85 64V0H0C13.7915 0 26.6905 7.30481 34 19L50 45Z" fill="currentColor" />
        </svg>

        <div className="flex justify-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-800 px-5 py-2.5 rounded-full font-medium shadow-sm hover:shadow transition-shadow">
            <span className="text-orange-500 bg-orange-100 p-1 rounded"><LinkIcon className="w-4 h-4" /></span>
            Short Links
          </button>
          <button className="flex items-center gap-2 bg-[#F6F8FA] border border-transparent text-gray-600 px-5 py-2.5 rounded-full font-medium hover:bg-gray-100 transition-colors">
            <span className="text-emerald-500 bg-emerald-100 p-1 rounded"><BarChart3 className="w-4 h-4" /></span>
            Conversion Analytics
          </button>
          <button className="flex items-center gap-2 bg-[#F6F8FA] border border-transparent text-gray-600 px-5 py-2.5 rounded-full font-medium hover:bg-gray-100 transition-colors">
            <span className="text-indigo-500 bg-indigo-100 p-1 rounded"><Users className="w-4 h-4" /></span>
            Affiliate Programs
          </button>
        </div>
        
      </div>
    </div>
  );
}