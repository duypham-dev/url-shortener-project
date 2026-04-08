import React, { useState } from 'react';
import { Link2, Copy, Check, Scissors } from 'lucide-react';
import {fetchShortenData, createShortenUrl} from '../api/urlApi';

const Home: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [shortenedUrl, setShortenedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setIsCopied(false);

    try {
      const data = await createShortenUrl(url);
      console.log('Rút gọn thành công: ', data);
      setShortenedUrl(data.shortUrl);
    } catch (error) {
      console.error('Lỗi khi rút gọn link: ', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shortenedUrl) return;
    try {
      await navigator.clipboard.writeText(shortenedUrl);
      setIsCopied(true);
      // Đặt lại trạng thái nút copy sau 2 giây
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Lỗi khi copy: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-lg">
        {/* Tiêu đề */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
            <Scissors className="w-6 h-6 text-gray-800" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Rút gọn liên kết</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Dán đường dẫn dài của bạn vào bên dưới để tạo một liên kết ngắn gọn.
          </p>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Link2 className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/very-long-url..."
              required
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full bg-gray-900 text-white font-medium py-3 rounded-lg hover:bg-gray-800 active:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Rút gọn ngay'
            )}
          </button>
        </form>

        {/* Khu vực hiển thị kết quả */}
        {shortenedUrl && (
          <div className="mt-8 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Liên kết đã rút gọn của bạn:
            </label>
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2 pl-4">
              <span className="text-gray-900 font-medium truncate mr-4">
                {shortenedUrl}
              </span>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-gray-900" />
                    Đã copy
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;