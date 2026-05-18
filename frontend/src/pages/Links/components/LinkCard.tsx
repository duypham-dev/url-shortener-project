import React from "react";
import { useNavigate } from "react-router-dom";
import type { LinkItem } from "../../../types/url.type";
import { Copy, Edit2, Share2, BarChart2, MoreHorizontal, Calendar, Tag, QrCode, MousePointerClick } from "lucide-react";
import { formatDate } from "../../../utils/date";
import { useCopyToClipboard } from "../../../hooks/useCopyToClipboard";
import { getShortUrlDisplay } from "../../../utils/url";
import { EditLinkModal } from "../../../components/EditLinkModal";
import { ShareLinkModal } from "../../../components/ShareLinkModal";


interface LinkCardProps {
  link: LinkItem;
  viewMode?: 'card' | 'row';
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export const LinkCard: React.FC<LinkCardProps> = React.memo(({ link, viewMode = 'row', isSelected = false, onToggleSelect }) => {
  const [copiedValue, copy] = useCopyToClipboard();
  const navigate = useNavigate();
  const shortUrlDisplay = getShortUrlDisplay(link.short_code);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);


  const defaultFavicon = "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=" + link.long_url + "&size=64";

  const navigateToAnalytics = (link: LinkItem) => {
    navigate(`/dashboard/links/${link.short_code}/analytics`);
  };

  /**
   * Navigate to the analytics page for this link.
   */
  const handleQrClick = () => {
    navigate(`/dashboard/links/${link.short_code}/analytics`);
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow ${viewMode === 'row' ? 'mb-4' : 'flex flex-col'}`}>
      <div className={`flex gap-4 ${viewMode === 'card' ? 'flex-col' : 'flex-col md:flex-row'}`}>
        {/* Left side: Checkbox & Icons */}
        <div className={`flex items-start gap-4 ${viewMode === 'card' ? 'justify-between w-full' : ''}`}>
          <div className="flex gap-4">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 mt-1 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <div className="sm:block mt-1 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200">
              <img src={defaultFavicon} alt="" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* If card view, we move the icons to the top right beside the favicon */}
          {viewMode === 'card' && (
            <div className="flex items-center text-gray-500 gap-1">
              <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" onClick={() => setShowEditModal(true)}><Edit2 size={16} /></button>
              <button className="p-1 hover:bg-gray-100 rounded-md transition-colors" onClick={() => setShowShareModal(true)} title="Share link"><Share2 size={16} /></button>
              <button onClick={() => navigateToAnalytics(link)} className="p-1 hover:bg-gray-100 rounded-md transition-colors"><BarChart2 size={16} /></button>
              <button onClick={handleQrClick} className={`p-1 rounded-md transition-colors ${link.has_qr ? 'text-blue-600 hover:bg-blue-50' : 'hover:bg-gray-100'}`}><QrCode size={16} /></button>
              <button className="p-1 hover:bg-gray-100 rounded-md transition-colors"><MoreHorizontal size={16} /></button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full overflow-hidden flex flex-col">
          {/* Top Title & Right Actions */}
          <div className="flex justify-between items-start gap-4">
            <h3 className={`font-bold text-gray-900 truncate hover:underline cursor-pointer ${viewMode === 'card' ? 'text-base' : 'text-lg'}`}
              onClick={() => navigateToAnalytics(link)}
            >
              {link.title || link.long_url.substring(0, 50) + "..."}
            </h3>

            {viewMode === 'row' && (
              <div className="flex items-center text-gray-500 gap-3">
                <button
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  onClick={() => setShowShareModal(true)}
                  title="Share link"
                >
                  <Share2 size={16} />
                </button>
                <button
                  onClick={() => navigateToAnalytics(link)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="View analytics"
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
            )}
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
              <MousePointerClick size={13} strokeWidth={2.5} className="text-blue-500" />
              <span className="font-semibold text-gray-800">{(link.click_count ?? 0).toLocaleString()}</span>
              <span className="text-gray-400">clicks</span>
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
      <ShareLinkModal 
        isOpen={showShareModal} 
        onClose={() => setShowShareModal(false)} 
        shortUrl={shortUrlDisplay} 
      />
    </div>
  );
});
