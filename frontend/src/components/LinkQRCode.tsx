import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import type { LinkItem } from '../types/url.type';
import { getQrCodeByShortCode } from '../api/qrCode.api';
import { useNavigate } from 'react-router-dom';

interface LinkQRCodeProps {
  link: LinkItem;
}

const LinkQRCode: React.FC<LinkQRCodeProps> = ({ link }) => {
  const navigate = useNavigate();

  const { data: qrCode, isLoading } = useQuery({
    queryKey: ['qrByShortCode', link.short_code],
    queryFn: () => getQrCodeByShortCode(link.short_code),
    enabled: !!link.short_code,
    staleTime: 5 * 60 * 1000,
  });

  const shortUrl = `https://short.ly/${link.short_code}`;

  return (
    <div className="w-full bg-white rounded-xl p-6 font-sans border border-gray-100">
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="flex-1">
          <h3 className="text-[17px] font-bold text-[#273144] mb-4">QR Code</h3>
          <div className="flex items-start gap-5">
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
                  value={shortUrl}
                  size={114}
                  fgColor={qrCode?.fgColor ?? '#e9e9e9ff'}
                  bgColor="#ffffff"
                  level={(qrCode?.errorCorrection ?? 'Q') as 'L' | 'M' | 'Q' | 'H'}
                />
              )}
            </div>

            <div className="flex flex-col gap-2">
              {qrCode?.cloudinaryUrl ? (
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
              ) : (
                <button
                  onClick={() => navigate(`/dashboard/qr/create?url=${encodeURIComponent(shortUrl)}`)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded text-sm font-medium text-[#273144] bg-white hover:bg-gray-50 transition-colors"
                >
                  Create QR Code
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkQRCode;
