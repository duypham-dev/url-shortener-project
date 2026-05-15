import React, { useMemo } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Clicks theo referrer</h2>

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

          <div className="mt-4 w-full">
            {data.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between gap-3 py-2">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors[idx % colors.length] }}
                  />
                  <div className="text-sm text-gray-700 truncate" style={{ maxWidth: 220 }}>
                    {item.name}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">{item.value.toLocaleString()}</div>
              </div>
            ))}
            {totalClicks > 0 && (
              <div className="border-t mt-3 pt-3 text-sm text-gray-500">
                Total: {totalClicks.toLocaleString()} clicks
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ReferrerPieCard = React.memo(ReferrerPieCardComponent);

export default ReferrerPieCard;
