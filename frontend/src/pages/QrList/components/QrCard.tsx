// frontend/src/components/QrCard.tsx
import React, { useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Download,
  RefreshCw,
  Copy,
  ExternalLink,
  QrCode,
  Calendar,
  BarChart2,
  Lock,
  Unlock,
} from "lucide-react";
import type { QrCodeItem } from "../../../types/qr.type";
import { useCopyToClipboard } from "../../../hooks/useCopyToClipboard";
import { formatDate } from "../../../utils/date";

interface QrCardProps {
  qrCode: QrCodeItem;
  onDisable?: (id: string, currentStatus: boolean) => void;
  onRegenerate?: (id: string) => void;
  viewMode?: 'card' | 'row';
}

const getShortUrlDisplay = (shortCode: string | null): string => {
  const base = import.meta.env.VITE_SHORT_LINK_BASE_URL || "https://short.ly";
  return shortCode ? `${base.replace(/^https?:\/\//, "")}/${shortCode}` : "";
};

export const QrCard: React.FC<QrCardProps> = React.memo(
  ({ qrCode, onDisable, onRegenerate, viewMode = 'row' }) => {
    const [copiedValue, copy] = useCopyToClipboard();

    const shortUrlDisplay = getShortUrlDisplay(qrCode.shortCode);

    // Use displayUrl (no ?r=qr) for UI; destinationUrl has the tracking param
    const displayDestination = qrCode.displayUrl || qrCode.destinationUrl.replace(/\?r=qr$/, "");
    const displayTitle = qrCode.title || displayDestination.substring(0, 60) + "...";

    // Download the QR code as PNG
    const handleDownload = useCallback(async () => {
      const svgEl = document.getElementById(`qr-svg-${qrCode.id}`)?.querySelector("svg");
      if (!svgEl) return;
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(svgEl);
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 300, 300);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `qr-${qrCode.id}.png`;
        a.click();
      };
    }, [qrCode]);

    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-shadow ${!qrCode.isActive ? "opacity-75 bg-gray-50" : "hover:shadow-md"} ${viewMode === 'row' ? 'mb-4' : 'flex flex-col'}`}>
        <div className={`flex gap-4 ${viewMode === 'card' ? 'flex-col' : 'flex-col sm:flex-row'}`}>
          {/* QR Code Preview */}
          <div className={`relative ${viewMode === 'card' ? 'self-center mb-2' : ''}`}>
            <div
              id={`qr-svg-${qrCode.id}`}
              className={`shrink-0 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-white p-1 ${!qrCode.isActive ? "grayscale blur-[2px]" : ""} ${viewMode === 'card' ? 'w-32 h-32' : 'w-20 h-20'}`}
            >
              <QRCodeSVG
                value={qrCode.destinationUrl}
                size={viewMode === 'card' ? 120 : 72}
                fgColor={qrCode.fgColor}
                bgColor={qrCode.bgColor}
                level={qrCode.errorCorrection as "L" | "M" | "Q" | "H"}
              />
            </div>
            {!qrCode.isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg">
                <Lock size={32} className="text-gray-700 drop-shadow-md" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title row + actions */}
            <div className="flex justify-between items-start gap-4">
              <h3 className={`font-bold text-base truncate ${!qrCode.isActive ? "text-gray-500" : "text-gray-900"}`} title={displayTitle}>
                {displayTitle}
              </h3>
              <div className="flex items-center text-gray-500 gap-2 shrink-0">
                {qrCode.isActive && (
                  <button
                    onClick={handleDownload}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    title="Download QR"
                  >
                    <Download size={15} />
                  </button>
                )}
                {onRegenerate && qrCode.isActive && (
                  <button
                    onClick={() => onRegenerate(qrCode.id)}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    title="Regenerate QR"
                  >
                    <RefreshCw size={15} />
                  </button>
                )}
                {onDisable && (
                  <button
                    onClick={() => onDisable(qrCode.id, qrCode.isActive)}
                    className={`p-1 rounded-md transition-colors ${qrCode.isActive ? "hover:bg-red-50 text-red-500 hover:text-red-700" : "hover:bg-green-50 text-green-500 hover:text-green-700"}`}
                    title={qrCode.isActive ? "Lock QR" : "Unlock QR"}
                  >
                    {qrCode.isActive ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                )}
              </div>
            </div>

            {/* Short link chip */}
            {qrCode.shortCode && (
              <div className="flex items-center gap-2 mt-1.5">
                <a
                  href={`https://${shortUrlDisplay}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-semibold text-sm hover:underline"
                >
                  {shortUrlDisplay}
                </a>
                <button
                  onClick={() => copy(shortUrlDisplay)}
                  className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Copy short URL"
                >
                  <Copy size={13} className={copiedValue ? "text-green-500" : ""} />
                </button>
              </div>
            )}

            {/* Destination URL (clean — no ?r=qr) */}
            <div className="mt-1.5 text-sm text-gray-500 flex items-center gap-1.5 truncate">
              <ExternalLink size={12} className="shrink-0" />
              <span className="truncate">{displayDestination}</span>
            </div>

            {/* Bottom meta row */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-medium text-gray-500">
              {/* Color dot */}
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full border border-gray-200 shrink-0"
                  style={{ backgroundColor: qrCode.fgColor }}
                />
                <span>{qrCode.fgColor}</span>
              </div>

              {/* Scan count */}
              <div className="flex items-center gap-1.5">
                <BarChart2 size={13} />
                <span>{qrCode.scanCount} scans</span>
              </div>

              {/* Link badge */}
              {qrCode.shortCode && (
                <div className="flex items-center gap-1 rounded-full px-2 py-0.5 bg-blue-50 text-blue-700">
                  <QrCode size={11} />
                  <span>{`Linked to /${qrCode.shortCode}`}</span>
                </div>
              )}

              {/* Created date */}
              <div className="flex items-center gap-1.5 ml-auto">
                <Calendar size={13} strokeWidth={2.5} />
                {formatDate(qrCode.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

QrCard.displayName = "QrCard";

export default QrCard;
