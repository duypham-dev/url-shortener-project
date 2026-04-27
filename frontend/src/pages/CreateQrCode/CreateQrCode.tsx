// frontend/src/pages/CreateQrCode/CreateQrCode.tsx
// Full-page QR creation form — standalone URL or linked to an existing short link.
import React, { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Download, ArrowLeft, HelpCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { createQrCode } from "../../api/qrCode.api";
import {
  usePlanStore,
  selectRemainingQrCodes,
  selectPlanName,
  selectCanUseQr,
} from "../../store/usePlanStore";
import { QR_COLORS } from "../../config/qr.constants";
import type { QrCodeItem } from "../../types/qr.type";

const ERROR_CORRECTION_OPTIONS = [
  { value: "L" as const, label: "L", desc: "Low (7%)" },
  { value: "M" as const, label: "M", desc: "Medium (15%)" },
  { value: "Q" as const, label: "Q", desc: "Quartile (25%)" },
  { value: "H" as const, label: "H", desc: "High (30%)" },
];

const CreateQrCode: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Plan info
  const remainingQrCodes = usePlanStore(selectRemainingQrCodes);
  const planName = usePlanStore(selectPlanName);
  const canUseQr = usePlanStore(selectCanUseQr);
  const isPlanLoading = usePlanStore((s) => s.isLoading);

  // Form state
  const initialUrl = searchParams.get("url") || "";
  const [destinationUrl, setDestinationUrl] = useState(initialUrl);
  const [title, setTitle] = useState("");
  const [fgColor, setFgColor] = useState(QR_COLORS[0]);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("Q");
  const [size] = useState(300);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdQr, setCreatedQr] = useState<QrCodeItem | null>(null);

  const isQuotaExceeded = remainingQrCodes !== null && remainingQrCodes <= 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!destinationUrl.trim() || isQuotaExceeded) return;

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const qr = await createQrCode({
          destinationUrl: destinationUrl.trim(),
          title: title.trim() || undefined,
          fgColor,
          bgColor,
          errorCorrection,
          size,
        });

        setCreatedQr(qr);
        queryClient.invalidateQueries({ queryKey: ["userQrCodes"] });
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
    [destinationUrl, title, fgColor, bgColor, errorCorrection, size, isQuotaExceeded, queryClient],
  );

  // Success state
  if (createdQr) {
    return (
      <div className="min-h-screen py-8 px-4 font-sans text-gray-900">
        <div className="max-w-[580px] mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">QR Code Ready!</h2>
            <p className="text-gray-500 mb-6 text-sm">
              Your QR code has been generated and saved.
            </p>

            {/* Preview */}
            <div className="inline-block border border-gray-200 rounded-lg p-4 bg-white mb-6">
              {createdQr.cloudinaryUrl ? (
                <img
                  src={createdQr.cloudinaryUrl}
                  alt="Generated QR Code"
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <QRCodeSVG
                  value={createdQr.destinationUrl}
                  size={192}
                  fgColor={createdQr.fgColor}
                  bgColor={createdQr.bgColor}
                  level={createdQr.errorCorrection as "L" | "M" | "Q" | "H"}
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {createdQr.cloudinaryUrl && (
                <a
                  href={createdQr.cloudinaryUrl}
                  download={`qr-${createdQr.id}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#232323] text-white rounded-md font-medium hover:bg-black transition-colors"
                >
                  <Download size={16} />
                  Download PNG
                </a>
              )}
              <button
                onClick={() => navigate("/dashboard/qr")}
                className="px-5 py-2.5 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View all QR Codes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 font-sans text-gray-900">
      <div className="max-w-[760px] mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard/qr")}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-500"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-[28px] font-bold text-[#141C3A]">
              Create QR Code
            </h1>
          </div>
          {/* Quota pill */}
          {!isPlanLoading && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
              <HelpCircle size={14} className="text-gray-400" />
              {remainingQrCodes === null
                ? `${planName}: unlimited`
                : `${planName}: ${remainingQrCodes} remaining`}
            </div>
          )}
        </div>

        {/* Plan gate inline message */}
        {!isPlanLoading && !canUseQr && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-800">
            QR codes are not available on your current plan.{" "}
            <button
              className="font-semibold underline hover:text-amber-900"
              onClick={() => navigate("/dashboard/upgrade")}
            >
              Upgrade now
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Section 1: Destination */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-[#141C3A] mb-4">
              QR Code Destination
            </h3>

            <div>
              <label className="block text-sm font-bold text-[#141C3A] mb-2">
                Destination URL *
              </label>
              <input
                required
                type="url"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://example.com/your-long-url"
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                This is the URL the QR code will point to when scanned.
              </p>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-bold text-[#141C3A] mb-2">
                Title (optional)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Product launch campaign"
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </section>

          {/* Section 2: Appearance */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-[#141C3A] mb-4">
              Appearance
            </h3>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Controls */}
              <div className="flex-1 space-y-6">

                {/* Foreground color */}
                <div>
                  <h4 className="text-sm font-semibold text-[#141C3A] mb-3">QR Color</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {QR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFgColor(color)}
                        className={`w-9 h-9 rounded-full transition-all duration-200 ${
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
                  <h4 className="text-sm font-semibold text-[#141C3A] mb-3">Background Color</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {["#ffffff", "#f8f9fa", "#e9ecef", "#ffd43b", "#74c0fc"].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBgColor(color)}
                        className={`w-9 h-9 rounded-full transition-all duration-200 border ${
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
                  <h4 className="text-sm font-semibold text-[#141C3A] mb-1">
                    Error Correction Level
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Higher levels allow QR to be readable even when partially damaged, but increase density.
                  </p>
                  <div className="flex gap-2">
                    {ERROR_CORRECTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setErrorCorrection(opt.value)}
                        className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
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
              <div className="w-56 shrink-0 flex flex-col items-center">
                <h4 className="text-sm font-semibold text-[#141C3A] mb-3 self-start">
                  Live Preview
                </h4>
                <div className="w-full aspect-square border border-gray-200 rounded-lg p-3 bg-white flex items-center justify-center">
                  <QRCodeSVG
                    value={destinationUrl || "https://example.com"}
                    size={180}
                    fgColor={fgColor}
                    bgColor={bgColor}
                    level={errorCorrection}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center leading-relaxed">
                  Preview updates as you type
                </p>
              </div>
            </div>
          </section>

          {/* Error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Footer */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard/qr")}
              className="px-4 py-2.5 rounded-md border border-gray-300 bg-white font-semibold text-[#141C3A] hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isQuotaExceeded || !canUseQr}
              className="px-6 py-2.5 rounded-md bg-[#2A5BD7] hover:bg-blue-700 text-white font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? "Generating..."
                : isQuotaExceeded
                  ? "Quota Exceeded"
                  : "Generate QR Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQrCode;
