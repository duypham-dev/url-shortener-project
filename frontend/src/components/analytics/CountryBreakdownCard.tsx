import React, { useMemo } from "react";
import { MapPin } from "lucide-react";
import type { AnalyticsBreakdownItem } from "../../types/analytics.type";

interface CountryBreakdownCardProps {
  data: AnalyticsBreakdownItem[];
}

const normalizeCountries = (data: AnalyticsBreakdownItem[]): AnalyticsBreakdownItem[] => {
  return [...data]
    .filter((item) => item.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 8);
};

export const CountryBreakdownCard: React.FC<CountryBreakdownCardProps> = ({ data }) => {
  const countries = useMemo(() => normalizeCountries(data), [data]);
  const totalClicks = useMemo(
    () => countries.reduce((sum, item) => sum + item.clicks, 0),
    [countries],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Clicks theo quốc gia</h2>
        <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
          <MapPin size={18} className="text-sky-600" />
        </div>
      </div>

      {countries.length === 0 ? (
        <div className="py-14 text-center text-gray-400 text-sm">
          Chưa có dữ liệu quốc gia.
        </div>
      ) : (
        <div className="space-y-3">
          {countries.map((item, index) => {
            const ratioPercent =
              totalClicks > 0 ? Math.round((item.clicks / totalClicks) * 100) : 0;

            return (
              <div key={`${item.label}-${index}`} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="text-gray-700 truncate" title={item.label}>
                    {item.label}
                  </div>
                  <div className="font-semibold text-gray-700">
                    {item.clicks.toLocaleString()}
                  </div>
                </div>

                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-500"
                    style={{ width: `${ratioPercent}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div className="border-t border-gray-100 pt-3 mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>Tổng</span>
            <span className="font-semibold text-gray-700">{totalClicks.toLocaleString()} clicks</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryBreakdownCard;
