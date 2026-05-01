import React, { useState, useEffect } from "react";
import { X, Save, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type { LinkItem } from "../../types/url.type";
import type { QrCodeItem } from "../../types/qr.type";
import { updateLink } from "../../api/link.api";
import { getQrCodeByShortCode, createQrCode, regenerateQrCode } from "../../api/qrCode.api";
import { getShortUrlDisplay } from "../../utils/url";
import { QR_COLORS } from "../../config/qr.constants";

interface EditLinkModalProps {
  link: LinkItem;
  onClose: () => void;
}

const ERROR_CORRECTION_OPTIONS = [
  { value: "L" as const, label: "L", desc: "Low (7%)" },
  { value: "M" as const, label: "M", desc: "Medium (15%)" },
  { value: "Q" as const, label: "Q", desc: "Quartile (25%)" },
  { value: "H" as const, label: "H", desc: "High (30%)" },
];

export const EditLinkModal: React.FC<EditLinkModalProps> = ({ link, onClose }) => {
  const queryClient = useQueryClient();
  const shortUrlDisplay = getShortUrlDisplay(link.short_code);

  // -- Link State --
  const [title, setTitle] = useState(link.title || "");

  // -- QR State --
  const [showQrPanel, setShowQrPanel] = useState(false);
  const [qrTitle, setQrTitle] = useState("");
  const [fgColor, setFgColor] = useState(QR_COLORS[0]);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("Q");

  // Fetch existing QR Code if the link has one
  const { data: existingQr, isLoading: isLoadingQr } = useQuery<QrCodeItem | null>({
    queryKey: ["qrByShortCode", link.short_code],
    queryFn: () => getQrCodeByShortCode(link.short_code),
    enabled: link.has_qr && !!link.short_code,
  });

  // Initialize QR state once fetched
  useEffect(() => {
    if (existingQr) {
      setQrTitle(existingQr.title || "");
      setFgColor(existingQr.fgColor || QR_COLORS[0]);
      setBgColor(existingQr.bgColor || "#ffffff");
      setErrorCorrection((existingQr.errorCorrection as any) || "Q");
    }
  }, [existingQr]);

  // -- Mutations --
  const updateLinkMutation = useMutation({
    mutationFn: () => updateLink(link.short_code, { title: title.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userLinks"] });
    },
  });

  const saveQrMutation = useMutation({
    mutationFn: async () => {
      if (existingQr) {
        return regenerateQrCode(existingQr.id, {
          title: qrTitle.trim() || undefined,
          fgColor,
          bgColor,
          errorCorrection,
        });
      } else {
        return createQrCode({
          urlMappingId: link.id,
          title: qrTitle.trim() || undefined,
          fgColor,
          bgColor,
          errorCorrection,
          size: 300,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userLinks"] });
      queryClient.invalidateQueries({ queryKey: ["userQrCodes"] });
      queryClient.invalidateQueries({ queryKey: ["qrByShortCode", link.short_code] });
    },
  });

  const handleSave = async () => {
    try {
      let updatedSomething = false;

      // Update link if title changed
      if (title.trim() !== (link.title || "").trim()) {
        await updateLinkMutation.mutateAsync();
        updatedSomething = true;
      }

      // Update/Create QR if panel is open and changes made (or it's new)
      if (showQrPanel) {
        const qrChanged =
          !existingQr ||
          qrTitle !== (existingQr.title || "") ||
          fgColor !== existingQr.fgColor ||
          bgColor !== existingQr.bgColor ||
          errorCorrection !== existingQr.errorCorrection;

        if (qrChanged) {
          await saveQrMutation.mutateAsync();
          updatedSomething = true;
        }
      }

      if (updatedSomething) {
        toast.success("Saved successfully");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to save changes");
    }
  };

  const isSaving = updateLinkMutation.isPending || saveQrMutation.isPending;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Edit Link</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Read-only fields */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Shortlink
              </label>
              <input
                type="text"
                value={shortUrlDisplay}
                readOnly
                className="w-full bg-gray-100/50 border-gray-200 text-gray-600 px-3 py-2 rounded text-sm cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Destination URL
              </label>
              <input
                type="text"
                value={link.long_url}
                readOnly
                className="w-full bg-gray-100/50 border-gray-200 text-gray-600 px-3 py-2 rounded text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Editable fields */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g. Product Launch Campaign"
              className="w-full border border-gray-300 px-3 py-2 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* QR Code Section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowQrPanel(!showQrPanel)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
                <QrCode size={18} className="text-blue-600" />
                {link.has_qr ? "Edit QR Code Style" : "Create QR Code"}
              </div>
              <span className="text-blue-600 text-sm font-medium">
                {showQrPanel ? "Hide" : "Show"}
              </span>
            </button>

            {showQrPanel && (
              <div className="p-4 bg-white border-t border-gray-200">
                {isLoadingQr && link.has_qr ? (
                  <div className="text-sm text-gray-500 p-4 text-center">Loading QR settings...</div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* QR Form */}
                    <div className="flex-1 space-y-4">
                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">QR Title (Optional)</label>
                         <input
                           type="text"
                           value={qrTitle}
                           onChange={(e) => setQrTitle(e.target.value)}
                           className="w-full border border-gray-300 px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                         />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Foreground Color</label>
                        <div className="flex flex-wrap gap-2">
                          {QR_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setFgColor(color)}
                              className={`w-7 h-7 rounded-full transition-transform ${
                                fgColor === color ? "ring-2 ring-offset-2 ring-blue-500" : "hover:scale-110 border border-gray-200"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Background Color</label>
                        <div className="flex flex-wrap gap-2">
                          {["#ffffff", "#f8f9fa", "#e9ecef", "#ffd43b", "#74c0fc"].map((color) => (
                            <button
                              key={color}
                              onClick={() => setBgColor(color)}
                              className={`w-7 h-7 rounded-full transition-transform border ${
                                bgColor === color ? "ring-2 ring-offset-2 ring-blue-500 border-transparent" : "border-gray-200 hover:scale-110"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1.5">Error Correction</label>
                         <div className="flex gap-2">
                            {ERROR_CORRECTION_OPTIONS.map((opt) => (
                               <button
                                  key={opt.value}
                                  onClick={() => setErrorCorrection(opt.value)}
                                  className={`flex-1 py-1 rounded text-xs font-medium border ${
                                     errorCorrection === opt.value
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                  }`}
                               >
                                  {opt.label}
                               </button>
                            ))}
                         </div>
                      </div>
                    </div>

                    {/* QR Preview */}
                    <div className="w-40 shrink-0 flex flex-col items-center">
                       <span className="text-sm font-medium text-gray-700 mb-2">Preview</span>
                       <div className="p-2 border border-gray-200 rounded-lg bg-white shadow-sm">
                         <QRCodeSVG
                           value={existingQr?.destinationUrl || shortUrlDisplay}
                           size={130}
                           fgColor={fgColor}
                           bgColor={bgColor}
                           level={errorCorrection}
                         />
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
