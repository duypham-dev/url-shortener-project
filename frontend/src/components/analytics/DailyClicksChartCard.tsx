import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DailyClicksChartPoint {
  label: string;
  clicks: number;
}

interface DailyClicksChartCardProps {
  data: DailyClicksChartPoint[];
}

const formatTooltipClicks = (
  value: number | string | readonly (number | string)[] | undefined,
): [string, string] => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;
  return [safeValue.toLocaleString(), "Clicks"];
};

const DailyClicksChartCardComponent: React.FC<DailyClicksChartCardProps> = ({ data }) => {
  return (
    <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Click theo ngày</h2>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          Chưa có dữ liệu click trong 30 ngày qua.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "13px",
              }}
              labelFormatter={(label) => `Ngày: ${label}`}
              formatter={formatTooltipClicks}
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#clickGradient)"
              dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export const DailyClicksChartCard = React.memo(DailyClicksChartCardComponent);

export default DailyClicksChartCard;
