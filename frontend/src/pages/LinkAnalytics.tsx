import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, BarChart2, TrendingUp, MousePointerClick, Lock, Crown } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LinkItem } from '../types/url.type';
import LinkCardDetail from '../components/LinkCardDetail';
import LinkQRCode from '../components/LinkQRCode';
import { getLinkAnalytics } from '../api/analytics.api';
import type { LinkAnalyticsData } from '../types/analytics.type';
import { usePlanStore, selectIsVip } from '../store/usePlanStore';

export const LinkAnalytics: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  
  const link = useLocation().state?.link as LinkItem ;
  const navigate = useNavigate();
  const isVip = usePlanStore(selectIsVip);
  const isLoaded = usePlanStore((s) => s.isLoaded);

  const [analytics, setAnalytics] = useState<LinkAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlanGated, setIsPlanGated] = useState(false);

  useEffect(() => {
    if (!shortCode || !isLoaded) return;

    // If free user, show gate immediately without calling API
    if (!isVip) {
      setIsPlanGated(true);
      setIsLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getLinkAnalytics(shortCode);
        setAnalytics(data);
      } catch (err: any) {
        if (err?.code === 'PLAN_REQUIRED') {
          setIsPlanGated(true);
        } else {
          setError(err?.message || 'Không thể tải dữ liệu phân tích.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [shortCode, isVip, isLoaded]);

  // Format date for chart labels (e.g., "15/04")
  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  // Chart data with formatted labels
  const chartData = analytics?.dailyClicks.map((d) => ({
    ...d,
    label: formatDateLabel(d.date),
  })) ?? [];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Plan gate — free user
  if (isPlanGated) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <button
          onClick={() => navigate('/dashboard/links')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách link
        </button>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Blurred preview */}
          <div className="relative">
            <div className="p-8 filter blur-sm opacity-50 pointer-events-none select-none">
              <div className="h-8 bg-gray-100 rounded w-48 mb-4"></div>
              <div className="h-48 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg"></div>
              <div className="flex gap-4 mt-4">
                <div className="h-20 bg-gray-50 rounded-lg flex-1"></div>
                <div className="h-20 bg-gray-50 rounded-lg flex-1"></div>
                <div className="h-20 bg-gray-50 rounded-lg flex-1"></div>
              </div>
            </div>

            {/* Overlay CTA */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
              <div className="text-center max-w-sm px-6">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <Crown size={28} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Nâng cấp để xem phân tích
                </h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Tính năng phân tích chi tiết với biểu đồ click theo ngày chỉ dành cho tài khoản trả phí.
                </p>
                <button
                  onClick={() => navigate('/dashboard/upgrade')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/25"
                >
                  <Lock size={16} />
                  Xem các gói nâng cấp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <button
          onClick={() => navigate('/dashboard/links')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách link
        </button>
        <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  // Success state — show analytics
  return (
    <div className="max-w-[1040px] mx-auto py-8 font-sans">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/dashboard/links')}
        className="flex items-center gap-2 text-[15px] font-bold text-[#273144] hover:opacity-80 mb-6 transition-opacity"
      >
        <ChevronLeft size={20} strokeWidth={2.5} />
        Back to list
      </button>

      {/* Page header and QR */}
      <div className="flex flex-col gap-6 mb-8">
        <LinkCardDetail link={link} />
        <LinkQRCode link={link} />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <MousePointerClick size={20} className="text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Tổng click</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics?.totalClicks.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Trung bình/ngày</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {chartData.length > 0
              ? Math.round((analytics?.totalClicks ?? 0) / chartData.length).toLocaleString()
              : 0}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <BarChart2 size={20} className="text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Ngày cao nhất</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {chartData.length > 0
              ? Math.max(...chartData.map((d) => d.clicks)).toLocaleString()
              : 0}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Click theo ngày
        </h2>

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            Chưa có dữ liệu click trong 30 ngày qua.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '13px',
                }}
                labelFormatter={(label) => `Ngày: ${label}`}
                formatter={(value?: number) => [value?.toLocaleString() ?? '0', 'Clicks']}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#clickGradient)"
                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default LinkAnalytics;
