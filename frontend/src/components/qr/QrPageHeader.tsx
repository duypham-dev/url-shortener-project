// frontend/src/components/qr/QrPageHeader.tsx
// Mirrors LinksPageHeader.tsx for the QR Codes list page.
import React from "react";

interface QrPageHeaderProps {
  onCreateQr: () => void;
  remainingQrCodes: number | null;
  planName: string;
  isPlanLoading: boolean;
}

const QrPageHeaderComponent: React.FC<QrPageHeaderProps> = ({
  onCreateQr,
  remainingQrCodes,
  planName,
  isPlanLoading,
}) => {
  const quotaLabel = isPlanLoading
    ? "Loading quota..."
    : remainingQrCodes === null
      ? `${planName}: unlimited QR codes`
      : `${planName}: ${remainingQrCodes} QR ${remainingQrCodes === 1 ? "code" : "codes"} remaining`;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          QR Codes
        </h1>
        <p className="text-sm text-gray-500 mt-1">{quotaLabel}</p>
      </div>
      <button
        type="button"
        onClick={onCreateQr}
        className="bg-[#232323] hover:bg-black text-gray-200 hover:text-white font-medium py-2 px-5 rounded-md transition-colors shadow-sm whitespace-nowrap"
      >
        Create QR Code
      </button>
    </div>
  );
};

export const QrPageHeader = React.memo(QrPageHeaderComponent);
export default QrPageHeader;
