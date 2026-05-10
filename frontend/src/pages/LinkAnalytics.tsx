import React, { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import LinkCardDetail from "../components/links/LinkCardDetail";
import LinkQRCode from "../components/qr/LinkQRCode";
import { usePlanStore, selectIsVip } from "../store/usePlanStore";

//Component
import TrafficBreakdownCard from "../components/analytics/TrafficBreakdownCard";
import CountryBreakdownCard from "../components/analytics/CountryBreakdownCard";
import AnalyticsSummaryCards from "../components/analytics/AnalyticsSummaryCards";
import DailyClicksChartCard from "../components/analytics/DailyClicksChartCard";
import ReferrerPieCard from "../components/analytics/ReferrerPieCard";
import TimeFilterPopover from "../components/analytics/TimeFilterPopover";
import PlanGatedOverlay from '../components/PlanGate';
import { useLinkAnalyticsData } from "../hooks/useLinkAnalyticsData";

//Type
import type { TimeseriesMode, AnalyticsQueryParams } from "../types/analytics.type";
import type { DateRange } from "../components/analytics/TimeFilterPopover";
import { format, parseISO } from "date-fns";

// ================================================================
// Main page component
// ================================================================

const REFERRER_COLORS = [
  "#3b82f6",
  "#fb923c",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#60a5fa",
  "#f43f5e",
];

export const LinkAnalytics: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();
  const isVip = usePlanStore(selectIsVip);
  const isLoaded = usePlanStore((s) => s.isLoaded);

  // ---- Filter state ----
  const [mode, setMode] = useState<TimeseriesMode>("last7d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const handleFilterChange = useCallback((newMode: TimeseriesMode, range?: DateRange) => {
    setMode(newMode);
    setCustomRange(newMode === "custom" ? range : undefined);
  }, []);

  const filterParams = useMemo<AnalyticsQueryParams>(() => {
    if (mode === "custom" && customRange) {
      return {
        mode,
        start: format(customRange.start, 'yyyy-MM-dd'),
        end: format(customRange.end, 'yyyy-MM-dd'),
      };
    }

    return { mode };
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

  const formatLabel = useCallback((bucket: string) => {
    if (activeMode === "last24h") {
      return format(new Date(bucket + ":00Z"), "HH:mm");
    }
    return format(parseISO(bucket), "dd/MM");
  }, [activeMode]);

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
      <PlanGatedOverlay onBack={() => navigate('/dashboard/links')} onUpgrade={() => navigate('/dashboard/upgrade')} />
    )
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

      {/* ============ Time Filter ============ */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Access Analytics</h2>
        <TimeFilterPopover value={mode} customRange={customRange} onChange={handleFilterChange} />
      </div>

      <AnalyticsSummaryCards
        totalClicks={totalClicks}
        averagePerDay={averagePerBucket}
        peakDayClicks={peakBucketClicks}
        mode={activeMode}
      />

      <div className="grid grid-cols-1 md:grid-cols-1">
        <DailyClicksChartCard data={chartData} mode={activeMode} />
      </div>

      <div className="mt-4">
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
