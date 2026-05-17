import React from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, BarChart2, Check, Mail, MessageCircle, AtSign } from 'lucide-react';
import { FaFacebook, FaSquareInstagram } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { QRCodeSVG } from 'qrcode.react';
import type { QrCodeItem } from '../types/qr.type';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortUrl?: string;
  qrCode?: QrCodeItem;
}

const SocialIconItem = React.memo(({ Icon, label, onClick }: { Icon: React.FC<any>, label: string, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 group transition-transform hover:-translate-y-1"
  >
    <div className="w-14 h-14 border border-gray-200 rounded-2xl flex items-center justify-center text-gray-700 bg-white group-hover:border-blue-500 group-hover:text-blue-600 transition-colors shadow-sm">
      <Icon size={24} strokeWidth={1.5} />
    </div>
    <span className="text-xs text-gray-600 font-medium">{label}</span>
  </button>
));

export const SuccessModal: React.FC<SuccessModalProps> = React.memo(({ isOpen, onClose, shortUrl, qrCode }) => {
  const [copiedValue, copy] = useCopyToClipboard();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCopy = () => {
    if (shortUrl) {
       // Append dummy prefix if it's just an id, otherwise use as is
       const fullUrl = shortUrl.startsWith('http') ? shortUrl : `https://${shortUrl}`;
       copy(fullUrl);
    }
  };

  const handleDownloadQr = () => {
    if (!qrCode) return;
    const svgEl = document.getElementById("success-modal-qr-svg");
    if (!svgEl) return;
    
    // Default size for PNG
    const size = 300; 
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svgEl);
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `qr-${qrCode.id}.png`;
      a.click();
    };
  };

  const handleShare = (platform: string) => {
    if (!shortUrl) return;
    const fullUrl = shortUrl.startsWith('http') ? shortUrl : `https://${shortUrl}`;
    const encodedUrl = encodeURIComponent(fullUrl);
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=Check this link out&body=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedUrl}`;
        break;
      default:
        return;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-white rounded-2xl shadow-xl z-[60] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between px-8 py-6 pb-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {shortUrl ? 'Your link is ready!' : 'Your QR Code is ready!'} <span role="img" aria-label="party">🎉</span>
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body content */}
        <div className="px-8 pb-8 flex flex-col gap-6">
          <p className="text-gray-600">
            {shortUrl 
              ? 'Copy the link below to share it or choose a platform to share it to.' 
              : 'Download your QR code below to share it.'}
          </p>

          {/* Link box */}
          {shortUrl && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-8 flex flex-col items-center justify-center gap-6 mt-2">
              <span className="text-xl truncate w-full font-bold text-blue-600 select-all">
                {shortUrl}
              </span>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    onClose();
                    const shortCode = qrCode?.shortCode || (shortUrl ? shortUrl.split('/').pop() : '');
                    navigate(`/dashboard/links/${shortCode}/analytics`);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <BarChart2 size={18} />
                  View link details
                </button>
                
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {copiedValue ? <Check size={18} /> : <Copy size={18} />}
                  {copiedValue ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            </div>
          )}

          {/* QR Code preview */}
          {qrCode && (
            <div className={`flex flex-col items-center gap-3 ${shortUrl ? 'border-t border-gray-100 pt-4' : ''}`}>
              {shortUrl && <p className="text-sm text-gray-500 font-medium">QR Code generated</p>}
              <div className={`p-2 bg-white rounded-lg shadow-sm border border-gray-200 flex justify-center items-center`}>
                <QRCodeSVG
                  id="success-modal-qr-svg"
                  value={qrCode.destinationUrl}
                  size={shortUrl ? 112 : 192} // 28 * 4 or 48 * 4
                  fgColor={qrCode.fgColor}
                  bgColor={qrCode.bgColor}
                  level={qrCode.errorCorrection as 'L' | 'M' | 'Q' | 'H'}
                />
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleDownloadQr}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Download PNG
                </button>
                <span className="text-gray-300">·</span>
                <button
                  onClick={() => { onClose(); navigate('/dashboard/qr'); }}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  View QR details
                </button>
              </div>
            </div>
          )}

          {/* Social share icons */}
          {shortUrl && (
            <div className="flex items-center justify-center gap-4 pt-4 mt-2 mb-2">
              <SocialIconItem Icon={MessageCircle} label="WhatsApp" onClick={() => handleShare('whatsapp')} />
              <SocialIconItem Icon={FaFacebook} label="Facebook" onClick={() => handleShare('facebook')} />
              <SocialIconItem Icon={FaSquareInstagram} label="Instagram" />
              <SocialIconItem Icon={X} label="X" onClick={() => handleShare('x')} />
              <SocialIconItem Icon={AtSign} label="Threads" />
              <SocialIconItem Icon={Mail} label="Email" onClick={() => handleShare('email')} />
            </div>
          )}

        </div>
      </div>
    </>,
    document.body
  );
});

export default SuccessModal;