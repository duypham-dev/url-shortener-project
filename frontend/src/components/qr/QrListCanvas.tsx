// frontend/src/components/qr/QrListCanvas.tsx
// Mirrors LinksListCanvas.tsx — renders a list of QrCard items.
import React from "react";
import { QrCode } from "lucide-react";
import { QrCard } from "../QrCard";
import type { QrCodeItem } from "../../types/qr.type";

interface QrListCanvasProps {
  qrCodes: QrCodeItem[];
  isLoading: boolean;
  error: string | null;
  onDisable?: (id: string, currentStatus: boolean) => void;
  onRegenerate?: (id: string) => void;
}

const QrListCanvasComponent: React.FC<QrListCanvasProps> = ({
  qrCodes,
  isLoading,
  error,
  onDisable,
  onRegenerate,
}) => {
  return (
    <div className="space-y-4 relative pt-4">
      {isLoading && (
        <div className="py-20 flex justify-center text-gray-400">
          Loading QR codes...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
          {error}
        </div>
      )}

      {!isLoading && !error && qrCodes.length === 0 && (
        <div className="text-center py-20 text-gray-500">
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
        />
      ))}
    </div>
  );
};

export const QrListCanvas = React.memo(QrListCanvasComponent);
export default QrListCanvas;
