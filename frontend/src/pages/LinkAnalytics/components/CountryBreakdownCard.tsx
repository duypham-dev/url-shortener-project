import React, { useMemo, useState } from "react";
import { Globe, MousePointerClick } from "lucide-react";
import type { AnalyticsBreakdownItem } from "../../../types/analytics.type";

interface CountryBreakdownCardProps {
  data: AnalyticsBreakdownItem[];
}

/**
 * Backend returns 2-letter ISO codes (e.g. 'VN', 'US') or 'Unknown'.
 */
const getCountryName = (code: string): string => {
  if (!code || code === "Unknown") return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
};

const getCountryCode = (code: string): string => {
  if (!code || code === "Unknown") return "un";
  return code.toLowerCase();
};

/**
 * Clean React component to handle Flag image with fallback state
 */
const FlagIcon = ({ code, countryName }: { code: string; countryName: string }) => {
  const [error, setError] = useState(false);

  if (code === "un" || error) {
    return (
      <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
        <Globe size={13} />
      </div>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={countryName}
      className="w-6 h-6 rounded-full object-cover border border-gray-100 shadow-sm shrink-0"
      onError={() => setError(true)}
    />
  );
};

const BAR_COLORS = [
  "bg-blue-100/80",
  "bg-emerald-100/80",
  "bg-purple-100/80",
  "bg-amber-100/80",
  "bg-rose-100/80",
  "bg-indigo-100/80",
  "bg-cyan-100/80",
  "bg-orange-100/80",
];

export const CountryBreakdownCard: React.FC<CountryBreakdownCardProps> = ({ data }) => {
  // Pre-calculate all derived data only when 'data' prop changes
  const { totalClicks, countries } = useMemo(() => {
    const normalized = [...data]
      .filter((item) => item.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8);

    const total = normalized.reduce((sum, item) => sum + item.clicks, 0);

    const itemsWithMeta = normalized.map((item) => ({
      ...item,
      ratioPercent: total > 0 ? Math.round((item.clicks / total) * 100) : 0,
      code: getCountryCode(item.label),
      countryName: getCountryName(item.label),
    }));

    return { totalClicks: total, countries: itemsWithMeta };
  }, [data]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-full font-sans">
      {/* Header matching mockup with font-normal */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
        <div className="relative">
          <span className="text-sm font-normal text-gray-500 pb-3 border-b-2 border-gray-500">Countries</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-gray-400 tracking-wider">
          <MousePointerClick size={13} strokeWidth={2.5} />
          CLICKS
        </div>
      </div>

      {countries.length === 0 ? (
        <div className="py-14 text-center text-gray-400 text-sm">
          No country data yet.
        </div>
      ) : (
        <div className="space-y-2.5">
          {countries.map((item, index) => {
            const barColor = BAR_COLORS[index % BAR_COLORS.length];
            return (
              <div
                key={`${item.label}-${index}`}
                className="flex items-center justify-between px-4 py-3 rounded-lg relative overflow-hidden bg-white border border-gray-100 hover:border-gray-200/80 transition-all group min-h-[46px]"
              >
                {/* Progress bar background overlay with distinct colors */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-100 ${barColor}`}
                  style={{ width: `${item.ratioPercent}%` }}
                />

                {/* Country Info (Left side) */}
                <div className="flex items-center gap-3 relative z-10">
                  <FlagIcon code={item.code} countryName={item.countryName} />
                  <span className="text-sm font-semibold text-gray-800">{item.countryName}</span>
                </div>

                {/* Clicks & Percent (Right side) */}
                <div className="flex items-center gap-3 relative z-10 text-sm font-medium text-gray-700">
                  <span>{item.clicks.toLocaleString()}</span>
                  <span className="text-gray-400 font-normal w-0 opacity-0 overflow-hidden group-hover:w-10 group-hover:opacity-100 transition-all duration-300 text-right">
                    {item.ratioPercent}%
                  </span>
                </div>
              </div>
            );
          })}

          <div className="border-t border-gray-100 pt-3 mt-4 flex items-center justify-between text-xs font-bold text-gray-400 tracking-wider">
            <span>TOTAL</span>
            <span className="text-gray-700">{totalClicks.toLocaleString()} CLICKS</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryBreakdownCard;
