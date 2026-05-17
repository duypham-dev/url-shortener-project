import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormControl, Select, MenuItem, type SelectChangeEvent } from "@mui/material";
import QRPanel from "./components/QRPanel";
import { QR_COLORS } from "../../config/qr.constants";
import { createShortenUrl } from "../../api/link.api";

// Reusable Toggle Switch UI
const Switch = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`${checked ? "bg-blue-600" : "bg-gray-200"} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
  >
    <span
      className={`${checked ? "translate-x-5" : "translate-x-0"} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
    />
  </button>
);

const baseURL = import.meta.env.VITE_SHORT_LINK_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const CreateLink: React.FC = () => {
  const navigate = useNavigate();
  const [destination, setDestination] = useState("");
  const [domain, setDomain] = useState(baseURL);
  const [title, setTitle] = useState("");

  const [generateQr, setGenerateQr] = useState(false);
  const [expirationEnabled, setExpirationEnabled] = useState(false);

  const [qrColor, setQrColor] = useState<string>(QR_COLORS[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!destination.trim()) return;

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        await createShortenUrl(destination.trim());
        navigate("/dashboard/links");
      } catch (err: unknown) {
        const msg =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "Failed to create short link. Please try again.";
        setSubmitError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [destination, navigate],
  );

  const handleDomainChange = (event: SelectChangeEvent<string>) => {
    setDomain(event.target.value);
  };

  return (
    <div className="min-h-screen py-8 px-4 font-sans text-gray-900">
      <div className="max-w-[760px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-bold text-[#141C3A]">
            Create a new link
          </h1>
          <button className="text-sm font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1.5">
            Bulk upload
            {/* SVG icon... */}
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* SECTION 1: Link details */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="mt-5">
              <label className="block text-sm font-bold text-[#141C3A] mb-2">
                Destination URL
              </label>
              <input
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="https://example.com/my-long-url"
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            {/* MUI Select applied here */}
            <div className="mt-5 grid grid-cols-12 gap-4 items-end">
              <div className="col-span-4">
                <label className="block text-sm font-bold text-[#141C3A] mb-2">
                  Short link domain
                </label>
                <FormControl fullWidth>
                  <Select
                    value={domain}
                    onChange={handleDomainChange}
                    // Thêm phần này để điều chỉnh bóng và style của Menu
                    MenuProps={{
                      slotProps: {
                        paper: {
                          sx: {
                            boxShadow: "0px 2px 8px rgba(0,0,0,0.15)", // Chỉnh shadow nhỏ lại theo ý bạn
                            marginTop: "4px", // Khoảng cách giữa Select box và Menu
                            border: "1px solid #e5e7eb", // (Tùy chọn) Thêm border nhẹ nếu muốn
                          },
                        },
                      },
                    }}
                    sx={{
                      backgroundColor: 'white',
                      height: '46px',
                      borderRadius: '0.375rem',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#d1d5db',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#9ca3af',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#2563eb',
                        borderWidth: '1px',
                      },
                    }}
                  >
                    <MenuItem value={baseURL}>{baseURL}</MenuItem>
                  </Select>
                </FormControl>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-bold text-[#141C3A] mb-2">
                Title (optional)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </section>

          {/* SECTION 2: Sharing options */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#141C3A]">
                Sharing options
              </h3>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gray-50 border border-gray-200 rounded">
                      <svg
                        className="w-5 h-5 text-gray-700"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h-2v2h2v-2zm-2 2h-2v2h2v-2zm2 2h-2v2h2v-2zm-4 0h-2v2h2v-2zm2 2h-2v2h2v-2zm2 0h2v2h-2v-2zm-4-4h-2v2h2v-2z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-[#141C3A]">
                      Generate a QR Code
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={generateQr} onChange={setGenerateQr} />
                  </div>
                </div>

                {generateQr && (
                  <QRPanel destination={destination} qrColor={qrColor} setQrColor={setQrColor} />
                )}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-[#141C3A]">
                Advanced settings
              </h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#141C3A]">
                  <svg
                    className="w-5 h-5 text-gray-800 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>

                  <span className="font-semibold">Link expiration</span>

                  <svg
                    className="w-4 h-4 text-teal-700"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                  </svg>
                </div>

                <Switch
                  checked={expirationEnabled}
                  onChange={setExpirationEnabled}
                />
              </div>
            </div>
          </section>

          {/* Error message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Footer Actions */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-md border border-gray-300 bg-white font-semibold text-[#141C3A] hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-md bg-[#2A5BD7] hover:bg-blue-700 text-white font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create your link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLink;