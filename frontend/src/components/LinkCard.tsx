import React from "react";
import { useNavigate } from "react-router-dom";
import type { LinkItem } from "../types/url.type";
import { Copy, Edit2, Share2, BarChart2, MoreHorizontal, Calendar, Tag, QrCode } from "lucide-react";
import { formatDate } from "../utils/date";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { getShortUrlDisplay } from "../utils/url";
import { EditLinkModal } from "./links/EditLinkModal";

interface LinkCardProps {
  link: LinkItem;
}

export const LinkCard: React.FC<LinkCardProps> = React.memo(({ link }) => {
  const [copiedValue, copy] = useCopyToClipboard();
  const navigate = useNavigate();
  const shortUrlDisplay = getShortUrlDisplay(link.short_code);
  const [showEditModal, setShowEditModal] = React.useState(false);

  const defaultFavicon = "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=" + link.long_url + "&size=64";

  const navigateToAnalytics = (link: LinkItem) => {
    navigate(`/dashboard/links/${link.short_code}/analytics`);
  };

  /**
   * Navigate to the analytics page for this link.
   * The CreateQrCode panel is embedded there, so the user can
   * create or manage the QR in the correct context.
   */
  const handleQrClick = () => {
    navigate(`/dashboard/links/${link.short_code}/analytics`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left side: Checkbox & Icons */}
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            className="w-4 h-4 mt-1 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <div className="sm:block mt-1 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
             <img src={defaultFavicon} alt="" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full overflow-hidden">
          {/* Top Title & Right Actions */}
          <div className="flex justify-between items-start gap-4">
            <h3 className="font-bold text-gray-900 text-lg truncate hover:underline cursor-pointer"
              onClick={() => navigateToAnalytics(link)}
            >
              {link.title || link.long_url.substring(0, 50) + "..."}
            </h3>
            <div className="flex items-center text-gray-500 gap-3">
              <button 
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => setShowEditModal(true)}
              >
                <Edit2 size={16} />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded-md transition-colors"><Share2 size={16} /></button>
              <button
                onClick={() => navigateToAnalytics(link)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                title="Xem phân tích"
              >
                <BarChart2 size={16} />
              </button>
              <button
                onClick={handleQrClick}
                className={`p-1 rounded-md transition-colors ${link.has_qr ? 'text-blue-600 hover:bg-blue-50' : 'hover:bg-gray-100'}`}
                title={link.has_qr ? "View QR Code" : "Create QR Code"}
              >
                <QrCode size={16} />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded-md transition-colors"><MoreHorizontal size={16} /></button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <a
              href={`${shortUrlDisplay}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 font-semibold text-sm hover:underline hover:text-blue-800"
            >
              {shortUrlDisplay}
            </a>
            <button
              onClick={() => copy(`${shortUrlDisplay}`)}
              className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Copy"
            >
              <Copy size={14} className={copiedValue ? "text-green-500" : ""} />
            </button>
          </div>

          <div className="mt-2 text-sm text-gray-600 flex items-center gap-2 truncate">
             {/* Small Arrow Icon */}
             <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 10l5 5-5 5" /><path d="M4 4v7a4 4 0 004 4h12" />
             </svg>
             <span className="truncate">{link.long_url}</span>
          </div>

          {/* Bottom stats row */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-medium text-gray-500">
             <button
               onClick={() => navigate(`/dashboard/links/${link.short_code}/analytics`)}
               className="px-2 py-1 bg-gray-50 border border-gray-200 rounded flex items-center gap-1.5 text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
             >
               Click data
             </button>
             
             <div className="flex items-center gap-1.5 text-gray-600 ml-1">
               <Calendar size={14} strokeWidth={2.5} />
               {formatDate(link.created_at)}
             </div>

             <div className="flex items-center gap-1.5 text-gray-600 cursor-pointer hover:text-gray-900 group">
               <Tag size={14} strokeWidth={2.5} className="group-hover:fill-gray-200" />
               No tags
             </div>
          </div>
        </div>
      </div>
      {showEditModal && (
        <EditLinkModal link={link} onClose={() => setShowEditModal(false)} />
      )}
    </div>
  );
});
