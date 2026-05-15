// frontend/src/components/qr/QrListCanvas.tsx
// Mirrors LinksListCanvas.tsx — renders a list of QrCard items.
import React from "react";
import { QrCode } from "lucide-react";
import { QrCard } from "./QrCard";
import type { QrCodeItem } from "../../../types/qr.type";

interface QrListCanvasProps {
  qrCodes: QrCodeItem[];
  isLoading: boolean;
  error: string | null;
  onDisable?: (id: string, currentStatus: boolean) => void;
  onRegenerate?: (id: string) => void;
  viewMode?: 'card' | 'row';
}

const QrListCanvasComponent: React.FC<QrListCanvasProps> = ({
  qrCodes,
  isLoading,
  error,
  onDisable,
  onRegenerate,
  viewMode = 'row',
}) => {
  return (
    <div className={`relative pt-4 min-h-[50vh] ${viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start content-start' : 'space-y-4'}`}>
      {isLoading && (
        <div className="py-20 flex justify-center text-gray-400 col-span-full">
          Loading QR codes...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200 col-span-full">
          {error}
        </div>
      )}

      {!isLoading && !error && qrCodes.length === 0 && (
        <div className="text-center py-20 text-gray-500 col-span-full">
          <QrCode className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="text-lg font-medium text-gray-700">No QR codes yet</p>
          <p className="text-sm mt-1">Create your first QR code to get started!</p>
        </div>
      )}

      {qrCodes.map((qr) => (
        <QrCard
          key={qr.id}
          qrCode={qr}
          onDisable={onDisable}
          onRegenerate={onRegenerate}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};

export const QrListCanvas = React.memo(QrListCanvasComponent);
export default QrListCanvas;
