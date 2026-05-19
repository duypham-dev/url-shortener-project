import React, { useEffect, useMemo, useState } from "react";
import {
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Award,
  HelpCircle,
  MousePointerClick,
  type LucideIcon
} from "lucide-react";
import type { AnalyticsBreakdownItem } from "../../../types/analytics.type";

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

const getTabItemIcon = (label: string, tab: BreakdownTabKey) => {
  const cleanLabel = label.toLowerCase();
  if (tab === "device") {
    if (cleanLabel.includes("mobile") || cleanLabel.includes("phone")) return <Smartphone size={13} />;
    if (cleanLabel.includes("tablet") || cleanLabel.includes("ipad")) return <Tablet size={13} />;
    return <Monitor size={13} />;
  }
  if (tab === "browser") {
    return <Globe size={13} />;
  }
  if (tab === "os") {
    if (cleanLabel.includes("windows")) return <Laptop size={13} />;
    if (cleanLabel.includes("mac") || cleanLabel.includes("ios") || cleanLabel.includes("apple") || cleanLabel.includes("osx")) return <Award size={13} />;
    if (cleanLabel.includes("android")) return <Smartphone size={13} />;
    return <Monitor size={13} />;
  }
  return <HelpCircle size={13} />;
};

const normalizeBreakdown = (
  items: AnalyticsBreakdownItem[],
): AnalyticsBreakdownItem[] => {
  return [...items]
    .filter((item) => item.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 8);
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

  // Pre-calculate derived values
  const { totalClicks, items } = useMemo(() => {
    const total = activeItems.reduce((sum, item) => sum + item.clicks, 0);
    const parsed = activeItems.map((item) => ({
      ...item,
      ratioPercent: total > 0 ? Math.round((item.clicks / total) * 100) : 0,
      icon: getTabItemIcon(item.label, activeTab),
    }));
    return { totalClicks: total, items: parsed };
  }, [activeItems, activeTab]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-full font-sans">
      {/* Tab-based Header exactly matching CountryBreakdownCard style with font-normal */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
        <div className="flex items-center gap-4">
          {TAB_CONFIG.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`relative pb-3 text-sm font-normal transition-all cursor-pointer focus:outline-none whitespace-nowrap ${isActive ? "text-black" : "text-gray-400 hover:text-gray-600"
                  }`}
              >
                {item.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-500 transition-all" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-gray-400 tracking-wider">
          <MousePointerClick size={13} strokeWidth={2.5} />
          CLICKS
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-14 text-center text-gray-400 text-sm">
          No click data for this section.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, index) => {
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

                {/* Item Info (Left side) */}
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0 shadow-sm">
                    {item.icon}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 truncate max-w-[160px] sm:max-w-xs" title={item.label}>
                    {item.label}
                  </span>
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

export default TrafficBreakdownCard;
