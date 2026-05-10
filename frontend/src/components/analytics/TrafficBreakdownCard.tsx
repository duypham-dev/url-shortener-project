import React, { useEffect, useMemo, useState } from "react";
import { Globe, Monitor, Smartphone, type LucideIcon } from "lucide-react";
import type { AnalyticsBreakdownItem } from "../../types/analytics.type";

type BreakdownTabKey = "device" | "browser" | "os";

interface TrafficBreakdownCardProps {
  deviceData: AnalyticsBreakdownItem[];
  browserData: AnalyticsBreakdownItem[];
  osData: AnalyticsBreakdownItem[];
}

const TAB_CONFIG: Array<{ key: BreakdownTabKey; label: string; Icon: LucideIcon }> = [
  { key: "device", label: "Devices", Icon: Smartphone },
  { key: "browser", label: "Browsers", Icon: Globe },
  { key: "os", label: "OS", Icon: Monitor },
];

const normalizeBreakdown = (
  items: AnalyticsBreakdownItem[],
): AnalyticsBreakdownItem[] => {
  return [...items]
    .filter((item) => item.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 8);
};

export const TrafficBreakdownCard: React.FC<TrafficBreakdownCardProps> = ({
  deviceData,
  browserData,
  osData,
}) => {
  const [activeTab, setActiveTab] = useState<BreakdownTabKey>("device");

  const breakdownByTab = useMemo<Record<BreakdownTabKey, AnalyticsBreakdownItem[]>>(
    () => ({
      device: normalizeBreakdown(deviceData),
      browser: normalizeBreakdown(browserData),
      os: normalizeBreakdown(osData),
    }),
    [deviceData, browserData, osData],
  );

  useEffect(() => {
    if (breakdownByTab[activeTab].length > 0) {
      return;
    }

    const fallbackTab = TAB_CONFIG.find(
      (item) => breakdownByTab[item.key].length > 0,
    );

    if (fallbackTab) {
      setActiveTab(fallbackTab.key);
    }
  }, [activeTab, breakdownByTab]);

  const activeItems = breakdownByTab[activeTab];
  const totalClicks = activeItems.reduce((sum, item) => sum + item.clicks, 0);
  const maxClicks = activeItems[0]?.clicks ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-semibold text-gray-900">Clicks by Device</h2>
        <span className="text-xs text-gray-500 uppercase tracking-wide">Top {activeItems.length}</span>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100 mb-5 overflow-x-auto">
        {TAB_CONFIG.map((item) => {
          const isActive = activeTab === item.key;
          const Icon = item.Icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      {activeItems.length === 0 ? (
        <div className="py-14 text-center text-gray-400 text-sm">
          No click data for this section.
        </div>
      ) : (
        <div className="space-y-3">
          {activeItems.map((item, index) => {
            const widthPercent =
              maxClicks > 0 ? Math.max((item.clicks / maxClicks) * 100, 8) : 0;
            const ratioPercent =
              totalClicks > 0 ? Math.round((item.clicks / totalClicks) * 100) : 0;

            return (
              <div
                key={`${item.label}-${index}`}
                className="grid grid-cols-[minmax(110px,1fr)_minmax(120px,3fr)_auto] items-center gap-3"
              >
                <div className="text-sm text-gray-700 truncate" title={item.label}>
                  {item.label}
                </div>

                <div className="relative h-9 rounded-md bg-emerald-100/80 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md bg-emerald-300 transition-all duration-500"
                    style={{ width: `${widthPercent}%` }}
                  />
                  <div className="relative h-full flex items-center px-3 text-xs font-semibold text-emerald-900">
                    {ratioPercent}%
                  </div>
                </div>

                <div className="text-sm font-semibold text-gray-700 min-w-10 text-right">
                  {item.clicks.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrafficBreakdownCard;
