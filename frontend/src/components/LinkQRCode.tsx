import React from 'react';
import { BarChart2 } from 'lucide-react';
import type { LinkItem } from '../types/url.type';
import { getShortUrlDisplay } from '../utils/url';

interface LinkQRCodeProps {
  link: LinkItem;
}

const LinkQRCode: React.FC<LinkQRCodeProps> = ({ link }) => {
  const shortUrl = getShortUrlDisplay(link.short_code);

  return (
    <div className="w-full bg-white rounded-xl p-6 font-sans border border-gray-100">
      <div className="flex flex-col sm:flex-row gap-8">
        {/* QR Code Section */}
        <div className="flex-1">
          <h3 className="text-[17px] font-bold text-[#273144] mb-4">QR Code</h3>
          <div className="flex items-start gap-5">
            <div className="w-[140px] h-[140px] p-3 border border-gray-200 rounded text-[#273144] bg-white flex items-center justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=273144&data=${encodeURIComponent('https://' + shortUrl)}`} 
                alt="QR Code" 
                className="w-full h-full object-contain opacity-80"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded text-sm font-medium text-[#273144] bg-white hover:bg-gray-50 transition-colors">
              <BarChart2 size={16} className="text-[#273144]" />
              Create QR Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkQRCode;
