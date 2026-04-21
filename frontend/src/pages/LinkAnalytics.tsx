import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, Lock, Crown } from "lucide-react";
import LinkCardDetail from "../components/LinkCardDetail";
import LinkQRCode from "../components/LinkQRCode";
import { usePlanStore, selectIsVip } from "../store/usePlanStore";
import TrafficBreakdownCard from "../components/analytics/TrafficBreakdownCard";
import CountryBreakdownCard from "../components/analytics/CountryBreakdownCard";
import AnalyticsSummaryCards from "../components/analytics/AnalyticsSummaryCards";
import DailyClicksChartCard from "../components/analytics/DailyClicksChartCard";
import ReferrerPieCard from "../components/analytics/ReferrerPieCard";
import { useLinkAnalyticsData } from "../hooks/useLinkAnalyticsData";

export const LinkAnalytics: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const isVip = usePlanStore(selectIsVip);
  const isLoaded = usePlanStore((s) => s.isLoaded);

  const { link, analytics, isLoading, error, isPlanGated } =
    useLinkAnalyticsData({
      shortCode,
      isVip,
      isPlanLoaded: isLoaded,
    });

  // Format date for chart labels (e.g., "15/04")
  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split("-");
    return `${parts[2]}/${parts[1]}`;
  };

  // Chart data with formatted labels
  const chartData = useMemo(
    () =>
      analytics?.dailyClicks.map((d) => ({
        ...d,
        label: formatDateLabel(d.date),
      })) ?? [],
    [analytics],
  );

  // Referrer pie chart data
  const referrerData = useMemo(() => {
    const items = analytics?.referrers ?? [];
    return items.map((r) => ({ name: r.referrer, value: r.clicks }));
  }, [analytics]);

  const totalClicks = analytics?.totalClicks ?? 0;
  const averagePerDay =
    chartData.length > 0 ? Math.round(totalClicks / chartData.length) : 0;
  const peakDayClicks =
    chartData.length > 0
      ? Math.max(...chartData.map((item) => item.clicks))
      : 0;

  const deviceBreakdown = analytics?.deviceBreakdown ?? [];
  const browserBreakdown = analytics?.browserBreakdown ?? [];
  const osBreakdown = analytics?.osBreakdown ?? [];
  const countryBreakdown = analytics?.countryBreakdown ?? [];

  const REFERRER_COLORS = [
    "#3b82f6",
    "#fb923c",
    "#a78bfa",
    "#34d399",
    "#f472b6",
    "#60a5fa",
    "#f43f5e",
  ];

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
      <div className="max-w-2xl mx-auto py-8 px-4 sm:px-0">
      {/* Nút quay lại */}
      <button
        onClick={() => navigate('/dashboard/links')}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={2.5} />
        Quay lại danh sách link
      </button>

      {/* Card chính */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="relative">
          {/* Skeleton UI (Background bị làm mờ)
            Được thiết kế lại để trông giống một dashboard thực thụ với các khối KPI và Chart 
          */}
          <div className="p-8 filter blur-[6px] opacity-40 pointer-events-none select-none">
            {/* Header giả */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="h-6 bg-slate-200 rounded-md w-40 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded-md w-64"></div>
              </div>
              <div className="h-10 bg-slate-100 rounded-lg w-28"></div>
            </div>

            {/* Khối KPI giả */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="h-24 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
              <div className="h-24 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
              <div className="h-24 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
            </div>

            {/* Chart giả */}
            <div className="h-56 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
          </div>

          {/* Overlay CTA (Bảng gọi hành động) */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="text-center max-w-sm px-6 py-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50">
              
              {/* Icon Box */}
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Crown size={26} className="text-slate-800" strokeWidth={2} />
              </div>
              
              {/* Text Content */}
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Nâng cấp để xem phân tích
              </h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed px-4">
                Mở khóa bảng điều khiển chi tiết, theo dõi lượt click theo thời gian thực và phân tích nguồn truy cập.
              </p>
              
              {/* Nút Action */}
              <button
                onClick={() => navigate('/dashboard/upgrade')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-all w-full justify-center"
              >
                <Lock size={16} strokeWidth={2} />
                Mở khóa tính năng
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
          onClick={() => navigate("/dashboard/links")}
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

  if (!link) return null;

  // Success state — show analytics
  return (
    <div className="max-w-[1040px] mx-auto py-8 font-sans">
      {/* Back navigation */}
      <button
        onClick={() => navigate("/dashboard/links")}
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

      <AnalyticsSummaryCards
        totalClicks={totalClicks}
        averagePerDay={averagePerDay}
        peakDayClicks={peakDayClicks}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DailyClicksChartCard data={chartData} />
        <ReferrerPieCard data={referrerData} colors={REFERRER_COLORS} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2">
          <TrafficBreakdownCard
            deviceData={deviceBreakdown}
            browserData={browserBreakdown}
            osData={osBreakdown}
          />
        </div>

        <CountryBreakdownCard data={countryBreakdown} />
      </div>
    </div>
  );
};

export default LinkAnalytics;
