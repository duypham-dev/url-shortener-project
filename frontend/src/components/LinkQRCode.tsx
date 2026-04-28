// frontend/src/components/LinkQRCode.tsx
//
// Shown on the LinkAnalytics page. Displays the QR code for the link
// when one exists, or renders an inline CreateQrCode panel when the
// user clicks "Create QR Code". No standalone creation route is used.

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';
import type { LinkItem } from '../types/url.type';
import { getQrCodeByShortCode } from '../api/qrCode.api';
import type { QrCodeItem } from '../types/qr.type';
import CreateQrCode from './qr/CreateQrCode';
import toast from 'react-hot-toast';

interface LinkQRCodeProps {
  link: LinkItem;
}

const LinkQRCode: React.FC<LinkQRCodeProps> = ({ link }) => {
  // Show the creation panel when true
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  // Fetch the existing QR (if any) for this short link
  const { data: qrCode, isLoading } = useQuery<QrCodeItem | null>({
    queryKey: ['qrByShortCode', link.short_code],
    queryFn: () => getQrCodeByShortCode(link.short_code),
    enabled: !!link.short_code,
    staleTime: 5 * 60 * 1000,
  });

  // Callback once a new QR is successfully created
  const handleQrCreated = () => {
    toast.success('QR code created successfully!');
  };

  return (
    <div className="w-full bg-white rounded-xl p-6 font-sans border border-gray-100">
      {/* ── Existing QR or "no QR yet" state ── */}
      {!showCreatePanel && (
        <div className="flex flex-col sm:flex-row gap-8">
          <div className="flex-1">
            <h3 className="text-[17px] font-bold text-[#273144] mb-4">QR Code</h3>
            <div className="flex items-start gap-5">
              {/* QR thumbnail */}
              <div className="w-[140px] h-[140px] p-3 border border-gray-200 rounded text-[#273144] bg-white flex items-center justify-center">
                {isLoading ? (
                  <div className="w-full h-full bg-gray-100 animate-pulse rounded" />
                ) : qrCode?.cloudinaryUrl ? (
                  <img
                    src={qrCode.cloudinaryUrl}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QRCodeSVG
                    value={qrCode?.destinationUrl ?? `https://short.ly/${link.short_code}`}
                    size={114}
                    fgColor={qrCode?.fgColor ?? '#111111'}
                    bgColor="#ffffff"
                    level={(qrCode?.errorCorrection ?? 'Q') as 'L' | 'M' | 'Q' | 'H'}
                  />
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                {qrCode?.cloudinaryUrl ? (
                  /* Download if stored on Cloudinary */
                  <a
                    href={qrCode.cloudinaryUrl}
                    download={`qr-${link.short_code}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded text-sm font-medium text-[#273144] bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Download size={14} />
                    Download QR
                  </a>
                ) : qrCode ? (
                  /* QR exists but no Cloudinary URL — nothing more to do */
                  <span className="text-sm text-gray-500">QR code saved</span>
                ) : (
                  /* No QR yet — prompt creation */
                  <button
                    onClick={() => setShowCreatePanel(true)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#2A5BD7] hover:bg-blue-700 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <QrCode size={14} />
                    Create QR Code
                  </button>
                )}

                {/* Scan stats */}
                {qrCode && (
                  <span className="text-xs text-gray-400">
                    {qrCode.scanCount} scan{qrCode.scanCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Inline creation panel ── */}
      {showCreatePanel && (
        <CreateQrCode
          urlMappingId={link.id}
          shortCode={link.short_code}
          onClose={() => setShowCreatePanel(false)}
          onSuccess={handleQrCreated}
        />
      )}
    </div>
  );
};

export default LinkQRCode;
