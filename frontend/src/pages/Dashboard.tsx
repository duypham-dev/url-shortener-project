import React, { useState } from 'react';
import { Link as LinkIcon, QrCode, Lock, HelpCircle } from 'lucide-react';
import { createShortenUrl } from '../api/link.api';
import { createQrCode as createQrCodeApi } from '../api/qrCode.api';
import { SuccessModal } from '../components/SuccessModal';
import { useQueryClient } from '@tanstack/react-query';
import { usePlanStore, selectPlanName, selectRemainingLinks } from '../store/usePlanStore';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [createQrCode, setCreateQrCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr'>('link');
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedShortUrl, setGeneratedShortUrl] = useState('');
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string | undefined>(undefined);

  // Plan data from shared store (fetched once in DashboardLayout)
  const planName = usePlanStore(selectPlanName);
  const remainingLinks = usePlanStore(selectRemainingLinks);
  const isPlanLoading = usePlanStore((s) => s.isLoading);
  const refreshUsage = usePlanStore((s) => s.refreshUsage);

  const isQuotaExceeded = remainingLinks !== null && remainingLinks <= 0;

  const handleCreate = async () => {
    if (!url) return;

    if (isQuotaExceeded && activeTab === 'link') {
      setCreateError('Bạn đã hết quota tạo link trong tháng này. Vui lòng nâng cấp gói.');
      return;
    }

    try {
      setCreateError(null);
      if (activeTab === 'link') {
        const response = await createShortenUrl(url, {
          generateQr: createQrCode,
        });
        
        const actualShortUrl = response?.shortUrl || "";
        
        if (actualShortUrl) {
          setGeneratedShortUrl(actualShortUrl);
          setGeneratedQrUrl(response?.qrCode?.cloudinaryUrl ?? undefined);
          setIsModalOpen(true);
          setUrl('');
          queryClient.invalidateQueries({ queryKey: ['userLinks'] });
          if (createQrCode) {
            queryClient.invalidateQueries({ queryKey: ['userQrCodes'] });
          }
          // Refresh only the usage/quota data after link creation
          refreshUsage();
        }
      } else {
        const response = await createQrCodeApi({
          destinationUrl: url,
        });
        
        setGeneratedShortUrl('');
        setGeneratedQrUrl(response?.cloudinaryUrl ?? undefined);
        setIsModalOpen(true);
        setUrl('');
        queryClient.invalidateQueries({ queryKey: ['userQrCodes'] });
      }
    } catch (error) {
      console.error('Error creating:', error); 
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : `Không thể tạo ${activeTab === 'link' ? 'short link' : 'QR code'}. Vui lòng thử lại.`;
      setCreateError(message);
      if (activeTab === 'link') {
        refreshUsage();
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-center mt-0 mx-auto border border-gray-300 rounded-lg p-6 bg-white">
        <div className="w-full max-w-200">
          
          {/* Tabs switch */}
          <div className="relative flex items-center p-1 max-w-fit mx-auto mb-8">
           <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
                activeTab === 'link' ? 'translate-x-0' : 'translate-x-full'
              }`}
            ></div>
            <button 
              onClick={() => setActiveTab('link')}
              className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all ${
                activeTab === 'link' ? 'text-black' : 'text-gray-500'
              }`}
            >
              <LinkIcon size={18} />
              Short link
            </button>
            <button 
              onClick={() => setActiveTab('qr')}
              className={`relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all ${
                activeTab === 'qr' ? 'text-black' : 'text-gray-500'
              }`}
            >
              <QrCode size={18} />
              QR Code
            </button>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-xl overflow-hidden">
            {/* Card Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Quick create: {activeTab === 'link' ? 'Short link' : 'QR Code'}
              </h2>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                {isPlanLoading
                  ? 'Đang tải quota...'
                  : remainingLinks === null
                    ? `Gói ${planName}: tạo link không giới hạn.`
                    : `Gói ${planName}: còn ${remainingLinks} link trong tháng này.`}
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
                    disabled={!url || (isQuotaExceeded && activeTab === 'link')}
                    className="whitespace-nowrap px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isQuotaExceeded && activeTab === 'link' ? 'Upgrade for more links' : `Create your ${activeTab === 'link' ? 'Short link' : 'QR Code'}`}
                  </button>
                </div>

                {createError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {createError}
                  </div>
                )}
              </div>

              {/* Checkbox Options */}
              {activeTab === 'link' && (
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
              )}
              
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
        qrCodeUrl={generatedQrUrl}
      />
    </>
  );
};

export default Dashboard;
