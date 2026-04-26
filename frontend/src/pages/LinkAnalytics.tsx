import React, { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, Lock, Crown, Clock, CalendarDays } from "lucide-react";
import LinkCardDetail from "../components/LinkCardDetail";
import LinkQRCode from "../components/LinkQRCode";
import { usePlanStore, selectIsVip } from "../store/usePlanStore";
import TrafficBreakdownCard from "../components/analytics/TrafficBreakdownCard";
import CountryBreakdownCard from "../components/analytics/CountryBreakdownCard";
import AnalyticsSummaryCards from "../components/analytics/AnalyticsSummaryCards";
import DailyClicksChartCard from "../components/analytics/DailyClicksChartCard";
import ReferrerPieCard from "../components/analytics/ReferrerPieCard";
import { useLinkAnalyticsData } from "../hooks/useLinkAnalyticsData";
import type { TimeseriesMode, AnalyticsQueryParams } from "../types/analytics.type";

// ----------------------------------------------------------------
// Time filter state & helpers
// ----------------------------------------------------------------

const getDefaultCustomRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().split("T")[0]!,
    end: end.toISOString().split("T")[0]!,
  };
};

export const LinkAnalytics: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const isVip = usePlanStore(selectIsVip);
  const isLoaded = usePlanStore((s) => s.isLoaded);

  // ---- Filter state ----
  const [mode, setMode] = useState<TimeseriesMode>("custom");
  const [customRange, setCustomRange] = useState(getDefaultCustomRange);

  const filterParams = useMemo<AnalyticsQueryParams>(() => {
    if (mode === "last24h") {
      return { mode: "last24h" };
    }
    // Convert "YYYY-MM-DD" to start-of-day / end-of-day ISO strings
    return {
      mode: "custom",
      start: new Date(customRange.start + "T00:00:00Z").toISOString(),
      end: new Date(customRange.end + "T23:59:59Z").toISOString(),
    };
  }, [mode, customRange]);

  const { link, timeseries, referrers, countries, devices, isLoading, error, isPlanGated } =
    useLinkAnalyticsData({
      shortCode,
      isVip,
      isPlanLoaded: isLoaded,
      filterParams,
    });

  // ---- Chart data ----
  const activeMode = timeseries?.mode ?? mode;

  const formatLabel = useCallback(
    (bucket: string) => {
      if (activeMode === "last24h") {
        // "2026-04-25T14:00" → "14:00"
        return bucket.split("T")[1] ?? bucket;
      }
      // "2026-04-25" → "25/04"
      const parts = bucket.split("-");
      return `${parts[2]}/${parts[1]}`;
    },
    [activeMode],
  );

  const chartData = useMemo(
    () =>
      timeseries?.items.map((d) => ({
        ...d,
        label: formatLabel(d.bucket),
      })) ?? [],
    [timeseries, formatLabel],
  );

  // Referrer pie chart data
  const referrerData = useMemo(() => {
    const items = referrers ?? [];
    return items.map((r) => ({ name: r.referrer, value: r.clicks }));
  }, [referrers]);

  // Summary stats computed from timeseries data
  const totalClicks = useMemo(
    () => chartData.reduce((sum, d) => sum + d.clicks, 0),
    [chartData],
  );
  const bucketCount = chartData.length;
  const averagePerBucket =
    bucketCount > 0 ? Math.round(totalClicks / bucketCount) : 0;
  const peakBucketClicks =
    bucketCount > 0
      ? Math.max(...chartData.map((item) => item.clicks))
      : 0;

  // Device / browser / OS / country breakdowns
  const deviceBreakdown = devices?.deviceTypes ?? [];
  const browserBreakdown = devices?.browsers ?? [];
  const osBreakdown = devices?.osList ?? [];
  const countryBreakdown = countries ?? [];

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
      <button
        onClick={() => navigate('/dashboard/links')}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={2.5} />
        Back to list
      </button>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="relative">
          <div className="p-8 filter blur-[6px] opacity-40 pointer-events-none select-none">
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="h-6 bg-slate-200 rounded-md w-40 mb-2"></div>
                <div className="h-4 bg-slate-100 rounded-md w-64"></div>
              </div>
              <div className="h-10 bg-slate-100 rounded-lg w-28"></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="h-24 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
              <div className="h-24 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
              <div className="h-24 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
            </div>
            <div className="h-56 border border-slate-100 bg-slate-50/50 rounded-lg"></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="text-center max-w-sm px-6 py-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50">
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Crown size={26} className="text-slate-800" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Nâng cấp để xem phân tích
              </h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed px-4">
                Mở khóa bảng điều khiển chi tiết, theo dõi lượt click theo thời gian thực và phân tích nguồn truy cập.
              </p>
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
          Back to list
        </button>
        <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!link) return null;

  // ---- Success state ----
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

      {/* ============ Time Filter UI ============ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              type="button"
              onClick={() => setMode("last24h")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "last24h"
                  ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Clock size={15} />
              24 giờ qua
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "custom"
                  ? "bg-white text-blue-700 shadow-sm border border-blue-100"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <CalendarDays size={15} />
              Tùy chọn
            </button>
          </div>

          {/* Custom date range inputs */}
          {mode === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customRange.start}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              />
              <span className="text-gray-400 text-sm">→</span>
              <input
                type="date"
                value={customRange.end}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              />
            </div>
          )}
        </div>
      </div>

      <AnalyticsSummaryCards
        totalClicks={totalClicks}
        averagePerDay={averagePerBucket}
        peakDayClicks={peakBucketClicks}
        mode={activeMode}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DailyClicksChartCard data={chartData} mode={activeMode} />
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
