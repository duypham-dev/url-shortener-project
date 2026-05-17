import React from 'react';
import { Link as LinkIcon, BarChart3, Users } from 'lucide-react';

export function Tabs() {
  return (
    <div className="w-full flex justify-center relative z-20">
      
      <div className="flex items-stretch my-0 shadow-[0_4px_0_0_#F6F8FA] lg:shadow-none">
        
        {/* 1. Left Inverted Corner SVG */}
        <svg
          preserveAspectRatio="none"
          viewBox="0 0 85 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          /* Thêm -mr-[1px] để kéo SVG sang phải 1px, tạo độ chồng lấp */
          className="w-[85px] text-white shrink-0 -mr-[1px]" 
        >
          <rect x="0" y="0" width="85" height="1" fill="currentColor" transform="translate(0, -1)" />
          <path d="M50 45C57.3095 56.6952 71.2084 63.9997 85 64V0H0C13.7915 0 26.6905 7.30481 34 19L50 45Z" fill="currentColor" />
        </svg>

        {/* 2. Center Div */}
        {/* Thêm relative z-10 để phần div này đè lên trên mép của SVG */}
        <div className="bg-white px-6 pb-6 pt-2 flex items-center justify-center gap-3 relative z-10">
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

        {/* 3. Right Inverted Corner SVG */}
        <svg
          preserveAspectRatio="none"
          viewBox="0 0 85 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          /* Thêm -ml-[1px] để kéo SVG sang trái 1px, tạo độ chồng lấp */
          className="w-[85px] text-white shrink-0 -scale-x-100 -ml-[1px]"
        >
          <rect x="0" y="0" width="85" height="1" fill="currentColor" transform="translate(0, -1)" />
          <path d="M50 45C57.3095 56.6952 71.2084 63.9997 85 64V0H0C13.7915 0 26.6905 7.30481 34 19L50 45Z" fill="currentColor" />
        </svg>

      </div>
      
    </div>
  );
}