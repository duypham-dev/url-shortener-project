import React from "react";
import { BarChart2, MousePointerClick, TrendingUp } from "lucide-react";
import type { TimeseriesMode } from "../../../types/analytics.type";

interface AnalyticsSummaryCardsProps {
  totalClicks: number;
  averagePerDay: number;
  peakDayClicks: number;
  mode: TimeseriesMode;
}

const AnalyticsSummaryCardsComponent: React.FC<AnalyticsSummaryCardsProps> = ({
  totalClicks,
  averagePerDay,
  peakDayClicks,
  mode,
}) => {
  const avgLabel = mode === "last24h" ? "Avg. Clicks / Hour" : "Avg. Clicks / Day";
  const peakLabel = mode === "last24h" ? "Peak Hour Clicks" : "Peak Day Clicks";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 font-sans">
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shadow-sm">
            <MousePointerClick size={16} />
          </div>
          <span className="text-sm font-normal text-gray-500">Total Clicks</span>
        </div>
        <div className="text-3xl font-bold text-gray-900 tracking-tight">{totalClicks.toLocaleString()}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shadow-sm">
            <TrendingUp size={16} />
          </div>
          <span className="text-sm font-normal text-gray-500">{avgLabel}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900 tracking-tight">{averagePerDay.toLocaleString()}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shadow-sm">
            <BarChart2 size={16} />
          </div>
          <span className="text-sm font-normal text-gray-500">{peakLabel}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900 tracking-tight">{peakDayClicks.toLocaleString()}</div>
      </div>
    </div>
  );
};

export const AnalyticsSummaryCards = React.memo(AnalyticsSummaryCardsComponent);

export default AnalyticsSummaryCards;
