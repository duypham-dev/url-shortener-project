import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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

const baseURL =
  import.meta.env.VITE_SHORT_LINK_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

// Validate custom alias on the client before sending to the server
const ALIAS_REGEX = /^[a-zA-Z0-9_-]+$/;

const CreateLink: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [destination, setDestination] = useState("");
  const [domain, setDomain] = useState(baseURL);
  const [title, setTitle] = useState("");

  const [customAliasEnabled, setCustomAliasEnabled] = useState(false);
  const [customAlias, setCustomAlias] = useState("");
  const [aliasError, setAliasError] = useState<string | null>(null);

  const [generateQr, setGenerateQr] = useState(false);
  const [expirationEnabled, setExpirationEnabled] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const [qrColor, setQrColor] = useState<string>(QR_COLORS[0]);
  const [qrBgColor, setQrBgColor] = useState<string>("#ffffff");
  const [qrErrorCorrection, setQrErrorCorrection] = useState<"L" | "M" | "Q" | "H">("Q");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateAlias = (value: string): string | null => {
    if (!value.trim()) return "Custom alias cannot be empty.";
    if (value.length < 3) return "Must be at least 3 characters.";
    if (value.length > 30) return "Must be at most 30 characters.";
    if (!ALIAS_REGEX.test(value))
      return "Only letters, numbers, hyphens (-) and underscores (_) allowed.";
    return null;
  };

  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAlias(value);
    if (customAliasEnabled) {
      setAliasError(validateAlias(value));
    }
  };

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!destination.trim()) return;

      // Validate alias before submitting
      if (customAliasEnabled) {
        const err = validateAlias(customAlias);
        if (err) {
          setAliasError(err);
          return;
        }
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        await createShortenUrl(destination.trim(), {
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(customAliasEnabled && customAlias.trim()
            ? { customAlias: customAlias.trim() }
            : {}),
          ...(expirationEnabled && expiresAt
            ? { expiresAt: new Date(expiresAt).toISOString() }
            : {}),
          ...(generateQr ? { generateQr: true, qrOptions: { fgColor: qrColor, bgColor: qrBgColor, errorCorrection: qrErrorCorrection } } : {}),
        });
        
        // Invalidate the cache so the list updates when we go back
        await queryClient.invalidateQueries({ queryKey: ['userLinks'] });
        
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
    [destination, title, customAliasEnabled, customAlias, expirationEnabled, expiresAt, generateQr, qrColor, qrBgColor, qrErrorCorrection, navigate, queryClient],
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
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors"
              />
            </div>

            {/* Domain selector + custom alias row */}
            <div className="mt-5 grid grid-cols-12 gap-4 items-start">
              <div className="col-span-4">
                <label className="block text-sm font-bold text-[#141C3A] mb-2">
                  Short link domain
                </label>
                <FormControl fullWidth>
                  <Select
                    value={domain}
                    onChange={handleDomainChange}
                    MenuProps={{
                      slotProps: {
                        paper: {
                          sx: {
                            boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
                            marginTop: "4px",
                            border: "1px solid #e5e7eb",
                          },
                        },
                      },
                    }}
                    sx={{
                      backgroundColor: "white",
                      height: "46px",
                      borderRadius: "0.375rem",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#d1d5db",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#9ca3af",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#000000",
                        borderWidth: "1px",
                      },
                    }}
                  >
                    <MenuItem value={baseURL}>{baseURL}</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {/* ── Phase 5: Custom back-half ──────────────────────────── */}
              <div className="col-span-8">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-bold text-[#141C3A]">
                    Custom back-half
                  </label>
                  <span className="text-xs text-gray-400 font-normal">
                    (optional)
                  </span>
                  <Switch
                    checked={customAliasEnabled}
                    onChange={(val) => {
                      setCustomAliasEnabled(val);
                      if (!val) {
                        setCustomAlias("");
                        setAliasError(null);
                      }
                    }}
                  />
                </div>
                {customAliasEnabled ? (
                  <div>
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-black focus-within:border-black transition-colors">
                      <span className="px-3 py-2.5 bg-gray-50 text-gray-500 text-sm border-r border-gray-300 whitespace-nowrap select-none">
                        /
                      </span>
                      <input
                        id="custom-alias-input"
                        value={customAlias}
                        onChange={handleAliasChange}
                        placeholder="my-brand"
                        className="flex-1 px-3 py-2.5 text-gray-900 bg-white focus:outline-none text-sm"
                        maxLength={30}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    {aliasError && (
                      <p className="mt-1 text-xs text-red-600">{aliasError}</p>
                    )}
                    {!aliasError && customAlias && (
                      <p className="mt-1 text-xs text-gray-400">
                        Short link will be{" "}
                        <span className="font-medium text-gray-600">
                          {baseURL}/{customAlias}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-2.5">
                    A random code will be generated automatically.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-bold text-[#141C3A] mb-2">
                Title (optional)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors"
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
                  <QRPanel destination={destination} qrColor={qrColor} setQrColor={setQrColor} bgColor={qrBgColor} setBgColor={setQrBgColor} errorCorrection={qrErrorCorrection} setErrorCorrection={setQrErrorCorrection} />
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
                  onChange={(val) => {
                    setExpirationEnabled(val);
                    if (!val) setExpiresAt("");
                  }}
                />
              </div>
              {expirationEnabled && (
                <div className="mt-4">
                  <label className="block text-sm font-bold text-[#141C3A] mb-2">
                    Expiration Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)} // Prevent selecting past dates
                    className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors"
                    required={expirationEnabled}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    After this date, the link will redirect to an expiration page or show a 410 Gone error.
                  </p>
                </div>
              )}
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
              disabled={isSubmitting || (customAliasEnabled && !!aliasError)}
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