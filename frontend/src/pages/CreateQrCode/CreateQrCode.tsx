// frontend/src/pages/CreateQrCode/CreateQrCode.tsx
//
// Reusable QR creation panel — rendered inline inside LinkQRCode.
// No longer a standalone route page. A QR code can only be created
// for an existing short link (urlMappingId is required).

import React, { useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, HelpCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { createQrCode } from "../../api/qrCode.api";
import {
  usePlanStore,
  selectRemainingQrCodes,
  selectPlanName,
  selectCanUseQr,
} from "../../store/usePlanStore";
import { QR_COLORS } from "../../config/qr.constants";
import type { QrCodeItem } from "../../types/qr.type";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface CreateQrCodePanelProps {
  /** The url_mappings.id of the short link this QR belongs to. */
  urlMappingId: string;
  /** Short code for live preview (e.g. "abc123"). */
  shortCode: string;
  /** Called when the user dismisses the panel without creating a QR. */
  onClose: () => void;
  /** Called with the newly created QR code after a successful submission. */
  onSuccess: (qr: QrCodeItem) => void;
}

const ERROR_CORRECTION_OPTIONS = [
  { value: "L" as const, label: "L", desc: "Low (7%)" },
  { value: "M" as const, label: "M", desc: "Medium (15%)" },
  { value: "Q" as const, label: "Q", desc: "Quartile (25%)" },
  { value: "H" as const, label: "H", desc: "High (30%)" },
];

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

const CreateQrCode: React.FC<CreateQrCodePanelProps> = ({
  urlMappingId,
  shortCode,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Plan quotas
  const remainingQrCodes = usePlanStore(selectRemainingQrCodes);
  const planName = usePlanStore(selectPlanName);
  const canUseQr = usePlanStore(selectCanUseQr);
  const isPlanLoading = usePlanStore((s) => s.isLoading);

  // Visual options
  const [title, setTitle] = useState("");
  const [fgColor, setFgColor] = useState(QR_COLORS[0]);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("Q");
  const size = 300; // fixed; user cannot change for now

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isQuotaExceeded = remainingQrCodes !== null && remainingQrCodes <= 0;

  // Build the preview URL from the short code
  const previewUrl = shortCode
    ? `${window.location.origin.replace("5173", "3000")}/${shortCode}`
    : "https://example.com";

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isQuotaExceeded || !canUseQr) return;

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const qr = await createQrCode({
          urlMappingId,
          title: title.trim() || undefined,
          fgColor,
          bgColor,
          errorCorrection,
          size,
        });

        // Invalidate relevant caches so the parent page refreshes
        queryClient.invalidateQueries({ queryKey: ["userQrCodes"] });
        queryClient.invalidateQueries({ queryKey: ["userLinks"] });
        queryClient.invalidateQueries({ queryKey: ["planContext"] });
        queryClient.invalidateQueries({ queryKey: ["qrByShortCode", shortCode] });

        onSuccess(qr);
        onClose();
      } catch (err: unknown) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to create QR code. Please try again.";
        setSubmitError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      urlMappingId,
      shortCode,
      title,
      fgColor,
      bgColor,
      errorCorrection,
      size,
      isQuotaExceeded,
      canUseQr,
      queryClient,
      onSuccess,
      onClose,
    ],
  );

  // ---- Form state ----
  return (
    <div className="bg-white rounded-xl border border-gray-100">
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <h3 className="text-[17px] font-bold text-[#141C3A]">Create QR Code</h3>
        <div className="flex items-center gap-3">
          {/* Quota pill */}
          {!isPlanLoading && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
              <HelpCircle size={12} className="text-gray-400" />
              {remainingQrCodes === null
                ? `${planName}: unlimited`
                : `${planName}: ${remainingQrCodes} remaining`}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Plan gate message */}
      {!isPlanLoading && !canUseQr && (
        <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          QR codes are not available on your current plan.{" "}
          <button
            className="font-semibold underline hover:text-amber-900"
            onClick={() => navigate("/dashboard/upgrade")}
          >
            Upgrade now
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-[#141C3A] mb-1.5">
            Title <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Product launch campaign"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Controls */}
          <div className="flex-1 space-y-5">
            {/* Foreground color */}
            <div>
              <h4 className="text-sm font-semibold text-[#141C3A] mb-2.5">QR Color</h4>
              <div className="flex flex-wrap gap-2">
                {QR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFgColor(color)}
                    className={`w-8 h-8 rounded-full transition-all duration-200 ${
                      fgColor === color
                        ? "ring-2 ring-offset-2 ring-blue-500"
                        : "border border-gray-200 hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Background color */}
            <div>
              <h4 className="text-sm font-semibold text-[#141C3A] mb-2.5">Background</h4>
              <div className="flex flex-wrap gap-2">
                {["#ffffff", "#f8f9fa", "#e9ecef", "#ffd43b", "#74c0fc"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setBgColor(color)}
                    className={`w-8 h-8 rounded-full transition-all duration-200 border ${
                      bgColor === color
                        ? "ring-2 ring-offset-2 ring-blue-500 border-transparent"
                        : "border-gray-200 hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Error correction */}
            <div>
              <h4 className="text-sm font-semibold text-[#141C3A] mb-0.5">
                Error Correction Level
              </h4>
              <p className="text-xs text-gray-500 mb-2.5">
                Higher = more readable when damaged, but denser.
              </p>
              <div className="flex gap-2">
                {ERROR_CORRECTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setErrorCorrection(opt.value)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      errorCorrection === opt.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                    title={opt.desc}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {ERROR_CORRECTION_OPTIONS.find((o) => o.value === errorCorrection)?.desc}
              </p>
            </div>
          </div>

          {/* Live Preview */}
          <div className="w-48 shrink-0 flex flex-col items-center">
            <h4 className="text-sm font-semibold text-[#141C3A] mb-2.5 self-start">
              Live Preview
            </h4>
            <div className="w-full aspect-square border border-gray-200 rounded-lg p-3 bg-white flex items-center justify-center">
              <QRCodeSVG
                value={previewUrl}
                size={156}
                fgColor={fgColor}
                bgColor={bgColor}
                level={errorCorrection}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Points to: <span className="font-medium">{shortCode}</span>
            </p>
          </div>
        </div>

        {/* Error message */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isQuotaExceeded || !canUseQr}
            className="px-5 py-2 rounded-md bg-[#2A5BD7] hover:bg-blue-700 text-white font-semibold text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? "Generating…"
              : isQuotaExceeded
                ? "Quota Exceeded"
                : "Generate QR Code"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateQrCode;
