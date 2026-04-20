import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

type Props = {
  destination: string;
  qrColor: string;
  setQrColor: (color: string) => void;
  size?: number;
};

const QR_COLORS = [
  '#000000',
  '#CE3B3D',
  '#DF8A25',
  '#418641',
  '#4FA1E7',
  '#405AC6',
  '#7055CE',
  '#C65089',
];

const QRPanel: React.FC<Props> = ({ destination, qrColor, setQrColor, size = 180 }) => {
  return (
    <div className="mt-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <p className="text-sm text-gray-700 mb-4">
        Create and customize a QR Code to connect with your audience offline.
      </p>

      <div className="bg-[#F8F9FA] rounded-xl p-6 border border-gray-100 flex flex-col md:flex-row gap-8">
        {/* Left: Customization Options */}
        <div className="flex-1 space-y-6">
          <div>
            <h4 className="text-[15px] font-semibold text-[#141C3A] mb-3">Code color</h4>
            <div className="flex flex-wrap gap-3">
              {QR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setQrColor(color)}
                  className={`w-9 h-9 rounded-full transition-all duration-200 ${
                    qrColor === color
                      ? 'ring-2 ring-offset-2 ring-blue-500 border-transparent'
                      : 'border border-gray-200 hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[15px] font-semibold text-[#141C3A] mb-3">Logo</h4>
            <div className="flex items-center gap-4">
              <div className="w-[84px] h-[84px] bg-[#EAECEF] rounded flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <button
                type="button"
                disabled
                className="px-5 py-2.5 border border-gray-200 rounded-md text-sm font-semibold text-[#B3C4F4] bg-white cursor-not-allowed"
              >
                Add logo
              </button>
            </div>
          </div>

          <p className="text-[13px] text-gray-500 mt-2">
            File type: PNG. 1:1 aspect ratio. Max size: 5MB, 2500x2500px
          </p>
        </div>

        {/* Right: Preview */}
        <div className="w-56 flex flex-col items-center flex-shrink-0">
          <h4 className="text-[15px] font-semibold text-[#141C3A] mb-3 self-start">Preview</h4>

          <div className="w-full aspect-square bg-white border border-gray-200 p-3 flex items-center justify-center">
            <QRCodeSVG value={destination || 'https://example.com'} size={size} bgColor={'#ffffff'} fgColor={qrColor} level={'Q'} />
          </div>

          <p className="text-[13px] text-gray-500 mt-4 text-center leading-relaxed">
            More customizations are available after creating.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRPanel;
