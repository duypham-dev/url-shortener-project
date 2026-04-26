import React from "react";
import { BarChart2, MousePointerClick, TrendingUp } from "lucide-react";
import type { TimeseriesMode } from "../../types/analytics.type";

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
  const avgLabel = mode === "last24h" ? "Trung bình/giờ" : "Trung bình/ngày";
  const peakLabel = mode === "last24h" ? "Giờ cao nhất" : "Ngày cao nhất";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <MousePointerClick size={20} className="text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-500">Tổng click</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{totalClicks.toLocaleString()}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <TrendingUp size={20} className="text-emerald-600" />
          </div>
          <span className="text-sm font-medium text-gray-500">{avgLabel}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{averagePerDay.toLocaleString()}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <BarChart2 size={20} className="text-purple-600" />
          </div>
          <span className="text-sm font-medium text-gray-500">{peakLabel}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{peakDayClicks.toLocaleString()}</div>
      </div>
    </div>
  );
};

export const AnalyticsSummaryCards = React.memo(AnalyticsSummaryCardsComponent);

export default AnalyticsSummaryCards;
