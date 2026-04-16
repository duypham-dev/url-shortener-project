import React from "react";
import {
  FiMoreHorizontal,
  FiEdit2,
  FiShare2,
  FiCopy,
  FiTag,
  FiChevronRight,
} from "react-icons/fi";
import type { LinkItem } from "../types/url.type";
import { formatDate } from "../utils/date";
import { getShortUrlDisplay } from "../utils/url";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

const LinkCardDetail: React.FC<{ link: LinkItem }> = ({ link }) => {
  const [copiedValue, copy] = useCopyToClipboard();
  const shortUrlDisplay = getShortUrlDisplay(link.short_code);

  const handleCopy = () => {
    copy(shortUrlDisplay);
  };

  return (
    <div className="w-full bg-white rounded-xl p-6 font-sans border border-gray-100">
      <div className="flex items-start gap-4">
        {/* Left Icon */}
        <div className="mt-1 w-8 h-8 rounded-full bg-[#f4f6fa] flex items-center justify-center text-gray-500 shrink-0 border border-gray-200">
          <FiChevronRight size={18} strokeWidth={2.5} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header & Actions */}
          <div className="flex justify-between items-start mb-2 gap-4">
            <h2 className="text-[22px] font-bold text-[#273144] truncate leading-tight">
              {link.title || link.long_url}
            </h2>

            <div className="flex items-center gap-2 shrink-0">
              <button className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded text-gray-700 transition-colors">
                <FiMoreHorizontal size={18} />
              </button>
              <button className="p-1.5 bg-white hover:bg-gray-50 border border-gray-300 rounded text-gray-700 transition-colors">
                <FiEdit2 size={16} />
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-[#eef1f6] hover:bg-[#e4e9f0] rounded text-[#273144] font-medium transition-colors text-sm border border-transparent">
                <FiShare2 size={16} />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Short URL Section */}
          <div className="flex items-center gap-2 mb-2">
            <a
              href={`https://${link.short_code}`}
              className="text-blue-600 hover:underline font-medium text-[15px]"
              target="_blank"
              rel="noreferrer"
            >
              {shortUrlDisplay}
            </a>
            <button
              onClick={() => handleCopy(link.short_code)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Copy"
            >
              <FiCopy size={16} />
            </button>
          </div>

          {/* Full URL Section */}
          <div className="flex items-center gap-2 text-gray-600 mb-6 group">
            <svg
              className="w-4 h-4 shrink-0 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 10l5 5-5 5" />
              <path d="M4 4v7a4 4 0 004 4h12" />
            </svg>
            <a
              href={link.long_url}
              className="text-[14px] truncate hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              {link.long_url}
            </a>
          </div>

          {/* Footer Info */}
          <div className="flex justify-between items-end text-sm text-gray-500 mt-2">
            <div className="flex items-center gap-2">
              <FiTag className="text-gray-500" size={14} />
              <span className="px-2 py-0.5 bg-[#eef1f6] rounded text-[#273144] font-medium text-xs">
                sd
              </span>
            </div>
            <div className="text-gray-500 text-xs font-medium">
              {formatDate(link.created_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkCardDetail;
