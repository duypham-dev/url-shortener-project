import React, { useCallback, useState } from "react";
import QRPanel from "./components/QRPanel";

// Danh sách các màu
const QR_COLORS = [
  "#000000", // Black
  "#CE3B3D", // Red
  "#DF8A25", // Orange
  "#418641", // Green
  "#4FA1E7", // Light Blue
  "#405AC6", // Blue
  "#7055CE", // Purple
  "#C65089", // Pink
];

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

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const CreateLink: React.FC = () => {
  const [destination, setDestination] = useState("");
  const [domain, setDomain] = useState(baseURL);
  const [title, setTitle] = useState("");

  const [generateQr, setGenerateQr] = useState(false);
  const [addToPage, setAddToPage] = useState(false);
  const [expirationEnabled, setExpirationEnabled] = useState(false);

  // Thêm State để lưu màu sắc mã QR, mặc định là màu đen
  const [qrColor, setQrColor] = useState<string>(QR_COLORS[0]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      console.log("Create link payload", {
        destination,
        domain,
        title,
        generateQr,
        qrColor, // Gửi cả màu QR lên backend nếu cần
        addToPage,
        expirationEnabled,
      });
    },
    [
      destination,
      domain,
      title,
      generateQr,
      qrColor,
      addToPage,
      expirationEnabled,
    ],
  );

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
          {/* SECTION 1: Link details (Giữ nguyên) */}
          <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            {/* ... code cũ của bạn ... */}
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
            <div className="mt-5 grid grid-cols-12 gap-4 items-end">
              <div className="col-span-4">
                <label className="block text-sm font-bold text-[#141C3A] mb-2">
                  Short link domain
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value={baseURL}>{baseURL}</option>
                </select>
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

          {/* Footer Actions */}

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2.5 rounded-md border border-gray-300 bg-white font-semibold text-[#141C3A] hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-md bg-[#2A5BD7] hover:bg-blue-700 text-white font-semibold shadow-sm"
            >
              Create your link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLink;
