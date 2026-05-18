import React, { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { MousePointerClick } from "lucide-react";
import { formatTooltipClicks } from "../../../utils/chart.utils";

interface ReferrerChartItem {
  name: string;
  value: number;
}

interface ReferrerPieCardProps {
  data: ReferrerChartItem[];
  colors: string[];
}

const ReferrerPieCardComponent: React.FC<ReferrerPieCardProps> = ({ data, colors }) => {
  const totalClicks = useMemo(
    () => data.reduce((sum, item) => sum + (item.value || 0), 0),
    [data],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 font-sans">
      {/* Header exactly matching CountryBreakdownCard style with font-normal */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
        <div className="relative">
          <span className="text-sm font-normal text-gray-500 pb-3 border-b-2 border-gray-500">Referrers</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-gray-400 tracking-wider">
          <MousePointerClick size={13} strokeWidth={2.5} />
          CLICKS
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-gray-400">No referrer data yet.</div>
      ) : (
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              >
                {data.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatTooltipClicks} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-6 w-full space-y-2.5">
            {data.map((item, idx) => {
              const ratioPercent =
                totalClicks > 0 ? Math.round((item.value / totalClicks) * 100) : 0;
              const color = colors[idx % colors.length];

              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-4 py-3 rounded-lg relative overflow-hidden bg-white border border-gray-100 hover:border-gray-200/80 transition-all group min-h-[46px]"
                >
                  {/* Progress bar background overlay using slice color with more contrast (opacity ~22%) */}
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-100"
                    style={{ 
                      width: `${ratioPercent}%`, 
                      backgroundColor: `${color}38` // 22% opacity of the slice color
                    }}
                  />

                  {/* Referrer Info (Left side) */}
                  <div className="flex items-center gap-3 relative z-10">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white shadow-sm shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]" title={item.name}>
                      {item.name}
                    </span>
                  </div>

                  {/* Clicks & Percent (Right side) */}
                  <div className="flex items-center gap-3 relative z-10 text-sm font-medium text-gray-700">
                    <span>{item.value.toLocaleString()}</span>
                    <span className="text-gray-400 font-normal w-0 opacity-0 overflow-hidden group-hover:w-10 group-hover:opacity-100 transition-all duration-300 text-right">
                      {ratioPercent}%
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
        </div>
      )}
    </div>
  );
};

export const ReferrerPieCard = React.memo(ReferrerPieCardComponent);

export default ReferrerPieCard;
