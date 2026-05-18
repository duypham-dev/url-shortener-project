import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "success" | "warning" | "info";
}

export const ConfirmModal: React.FC<ConfirmModalProps> = React.memo(({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
}) => {
  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal Card */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-white rounded-xl shadow-xl z-[60] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 p-6 border border-gray-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-xl font-extrabold text-[#1a253c] tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-full transition-colors focus:outline-none shrink-0 cursor-pointer"
          >
            <X size={20} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Content */}
        <p className="text-[15px] text-[#0f172a] leading-relaxed pr-4 font-medium">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end gap-3 text-sm font-bold">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer focus:outline-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 bg-[#3b5ce5] hover:bg-[#2b4cd0] text-white rounded-lg transition-colors cursor-pointer focus:outline-none"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
});

export default ConfirmModal;
