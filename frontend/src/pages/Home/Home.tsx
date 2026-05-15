import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, HelpCircle } from 'lucide-react';

//API
import { createShortenUrl } from '../../api/link.api';

//Component
import { SuccessModal } from '../../components/SuccessModal';

//Store
import { usePlanStore, selectPlanName, selectRemainingLinks } from '../../store/usePlanStore';

//Type
import type { QrCodeItem } from '../../types/qr.type';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [createQrCode, setCreateQrCode] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedShortUrl, setGeneratedShortUrl] = useState('');
  const [generatedQr, setGeneratedQr] = useState<QrCodeItem | undefined>(undefined);

  // Plan data from shared store (fetched once in DashboardLayout)
  const planName = usePlanStore(selectPlanName);
  const remainingLinks = usePlanStore(selectRemainingLinks);
  const isPlanLoading = usePlanStore((s) => s.isLoading);
  const refreshUsage = usePlanStore((s) => s.refreshUsage);

  const isQuotaExceeded = remainingLinks !== null && remainingLinks <= 0;

  const handleCreate = async () => {
    if (!url) return;

    if (isQuotaExceeded) {
      setCreateError('You have reached your link creation quota for this month. Please upgrade your plan.');
      return;
    }

    try {
      setCreateError(null);
      const response = await createShortenUrl(url, {
        generateQr: createQrCode,
      });

      const actualShortUrl = response?.shortUrl || "";

      if (actualShortUrl) {
        setGeneratedShortUrl(actualShortUrl);
        setGeneratedQr(response?.qrCode);
        setIsModalOpen(true);
        setUrl('');
        queryClient.invalidateQueries({ queryKey: ['userLinks'] });
        if (createQrCode) {
          queryClient.invalidateQueries({ queryKey: ['userQrCodes'] });
        }
        // Refresh only the usage/quota data after link creation
        refreshUsage();
      }
    } catch (error) {
      console.error('Error creating:', error);
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : `Unable to create short link. Please try again.`;
      setCreateError(message);
      refreshUsage();
    }
  };

  return (
    <>
      <div className="flex items-center justify-center mt-0 mx-auto border border-gray-300 rounded-lg p-6 bg-white">
        <div className="w-full max-w-200">
          {/* Main Card */}
          <div className="bg-white rounded-xl overflow-hidden">
            {/* Card Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Quick create: Short link
              </h2>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                {isPlanLoading
                  ? 'Loading quota...'
                  : remainingLinks === null
                    ? `${planName} Plan: unlimited links.`
                    : `${planName} Plan: ${remainingLinks} links left this month.`}
                <HelpCircle size={16} className="text-gray-400" />
              </div>
            </div>

            {/* Card Body */}
            <div className="px-8 py-6 space-y-6">

              {/* Domain Input Area */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Domain: {import.meta.env.VITE_API_BASE_URL}
                  <Lock size={14} className="text-gray-500" />
                </label>
              </div>

              {/* Destination URL Input */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Enter your destination URL
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/my-long-url"
                      className="block w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                    />
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={!url || isQuotaExceeded}
                    className="whitespace-nowrap px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isQuotaExceeded ? 'Upgrade for more links' : `Create your Short link`}
                  </button>
                </div>

                {createError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {createError}
                  </div>
                )}
              </div>

              {/* Checkbox Options */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="qr-checkbox"
                  checked={createQrCode}
                  onChange={(e) => setCreateQrCode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="qr-checkbox" className="text-sm text-gray-700">
                  Also create a QR Code for this link
                </label>
              </div>

              {/* Promo Banner */}
              <div className="mt-8 bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex items-center justify-center gap-2 text-sm text-blue-800">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2l1.22 3.78L15 7l-3.78 1.22L10 12l-1.22-3.78L5 7l3.78-1.22L10 2zm0 10l.87 2.63L13 15.5l-2.63.87L10 19l-.87-2.63L6.5 15.5l2.63-.87L10 12z" clipRule="evenodd" />
                </svg>
                <span>
                  Set a custom URL, like <span className="font-semibold">pdv.guru</span>, and earn up to 230% more clicks on average.
                </span>
                <a href="#" className="font-semibold text-blue-600 hover:underline hover:text-blue-800 ml-1">
                  Explore options
                </a>
              </div>

            </div>
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        shortUrl={generatedShortUrl}
        qrCode={generatedQr}
      />
    </>
  );
};

export default Dashboard;
