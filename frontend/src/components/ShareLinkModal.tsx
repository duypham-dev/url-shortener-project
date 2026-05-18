import React from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Copy } from 'lucide-react';
import { FaFacebook, FaXTwitter, FaThreads, FaTelegram } from 'react-icons/fa6';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import toast from 'react-hot-toast';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortUrl: string;
}

const SharePlatformItem = React.memo(({ 
  Icon, 
  label, 
  onClick, 
  customIcon 
}: { 
  Icon?: React.FC<any>, 
  label: string, 
  onClick: () => void, 
  customIcon?: React.ReactNode 
}) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 group transition-transform hover:-translate-y-1 focus:outline-none cursor-pointer"
  >
    <div className="w-16 h-16 border border-gray-200 rounded-2xl flex items-center justify-center bg-white group-hover:border-blue-500 group-hover:shadow-md transition-all shadow-sm">
      {customIcon ? customIcon : Icon && <Icon size={32} className="transition-transform group-hover:scale-105" />}
    </div>
    <span className="text-xs text-gray-600 font-semibold group-hover:text-gray-900 transition-colors">{label}</span>
  </button>
));

export const ShareLinkModal: React.FC<ShareLinkModalProps> = React.memo(({ isOpen, onClose, shortUrl }) => {
  const [copiedValue, copy] = useCopyToClipboard();

  if (!isOpen) return null;

  const fullUrl = shortUrl.startsWith('http') ? shortUrl : `https://${shortUrl}`;
  const encodedUrl = encodeURIComponent(fullUrl);

  const handleCopy = () => {
    copy(fullUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleShare = (platform: string) => {
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}`;
        break;
      case 'threads':
        shareUrl = `https://threads.net/intent/post?text=${encodedUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}`;
        break;
      default:
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return createPortal(
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-2xl shadow-xl z-[60] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 p-6 border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-50">
          <h2 className="text-xl font-bold text-gray-900">
            Share your Link
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6 pt-6">
          {/* Social Platforms Row */}
          <div className="flex items-center justify-center gap-4 sm:gap-5 py-2">
            <SharePlatformItem 
              Icon={FaFacebook} 
              label="Facebook" 
              onClick={() => handleShare('facebook')} 
              customIcon={<FaFacebook size={32} className="text-[#1877F2] transition-transform group-hover:scale-105" />}
            />
            <SharePlatformItem 
              Icon={FaXTwitter} 
              label="X" 
              onClick={() => handleShare('x')} 
              customIcon={<FaXTwitter size={26} className="text-black transition-transform group-hover:scale-105" />}
            />
            <SharePlatformItem 
              Icon={FaThreads} 
              label="Threads" 
              onClick={() => handleShare('threads')} 
              customIcon={<FaThreads size={26} className="text-black transition-transform group-hover:scale-105" />}
            />
            <SharePlatformItem 
              Icon={FaTelegram} 
              label="Telegram" 
              onClick={() => handleShare('telegram')} 
              customIcon={<FaTelegram size={32} className="text-[#26A5E4] transition-transform group-hover:scale-105" />}
            />
          </div>

          {/* Copy Box */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50 hover:border-gray-300 transition-colors mt-2">
            <span className="flex-1 text-gray-800 text-sm font-semibold truncate select-all">{fullUrl}</span>
            <button 
              onClick={handleCopy}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none ${
                copiedValue 
                  ? 'bg-green-50 text-green-700 border border-green-200 shadow-sm' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm'
              }`}
            >
              {copiedValue ? (
                <>
                  <Check size={14} className="text-green-600 stroke-[3px]" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} className="text-gray-500" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
});

export default ShareLinkModal;
