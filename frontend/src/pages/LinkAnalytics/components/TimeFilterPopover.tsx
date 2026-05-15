import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { TimeseriesMode } from "../../../types/analytics.type";

// ----------------------------------------------------------------
// Preset definitions
// ----------------------------------------------------------------

interface TimePreset {
  value: TimeseriesMode;
  label: string;
  shortcut: string;
}

const TIME_PRESETS: TimePreset[] = [
  { value: "last24h", label: "Last 24 hours", shortcut: "D" },
  { value: "last7d", label: "Last 7 days", shortcut: "W" },
  { value: "last30d", label: "Last 30 days", shortcut: "T" },
];

const MAX_CUSTOM_RANGE_DAYS = 30;

const getPresetLabel = (mode: TimeseriesMode): string =>
  TIME_PRESETS.find((p) => p.value === mode)?.label ?? "Last 7 days";

// ----------------------------------------------------------------
// Date range computation (mirrors server logic for calendar highlight)
// ----------------------------------------------------------------

export interface DateRange {
  start: Date;
  end: Date;
}

const resolveClientDateRange = (mode: TimeseriesMode, customRange?: DateRange): DateRange => {
  if (mode === "custom" && customRange) {
    return customRange;
  }

  const now = new Date();

  if (mode === "last24h") {
    return {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      end: now,
    };
  }

  const daysBack = mode === "last7d" ? 7 : 30;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (daysBack - 1));

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// ----------------------------------------------------------------
// Calendar helpers
// ----------------------------------------------------------------

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const getFirstDayOfWeek = (year: number, month: number): number =>
  new Date(year, month, 1).getDay();

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isInRange = (date: Date, start: Date, end: Date): boolean => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  return d >= s && d <= e;
};

const formatMonthYear = (year: number, month: number): string => {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const formatDateShort = (date: Date): string =>
  date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

const daysDiff = (a: Date, b: Date): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.abs(Math.floor((b.getTime() - a.getTime()) / msPerDay));
};

const isFutureDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date > today;
};

// ----------------------------------------------------------------
// Mini calendar (one month)
// ----------------------------------------------------------------

interface MiniCalendarProps {
  year: number;
  month: number;
  rangeStart: Date;
  rangeEnd: Date;
  today: Date;
  /** First date of a pending selection (user clicked once) */
  selectionStart: Date | null;
  onDayClick: (date: Date) => void;
  interactive: boolean;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({
  year,
  month,
  rangeStart,
  rangeEnd,
  today,
  selectionStart,
  onDayClick,
  interactive,
}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const cells: React.ReactNode[] = [];

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="w-8 h-8" />);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const inRange = isInRange(date, rangeStart, rangeEnd);
    const isToday = isSameDay(date, today);
    const isStart = isSameDay(date, rangeStart);
    const isEnd = isSameDay(date, rangeEnd);
    const isSelStart = selectionStart !== null && isSameDay(date, selectionStart);
    const future = isFutureDate(date);
    // Disable if in the future, or if selecting end date and would exceed 30-day limit
    const exceedsRange = selectionStart !== null && !future && daysDiff(selectionStart, date) > MAX_CUSTOM_RANGE_DAYS;
    const disabled = future || exceedsRange;

    cells.push(
      <button
        key={day}
        type="button"
        disabled={disabled || !interactive}
        onClick={() => !disabled && interactive && onDayClick(date)}
        className={`w-8 h-8 flex items-center justify-center text-xs rounded-md transition-colors ${disabled
            ? "text-gray-300 cursor-not-allowed"
            : interactive
              ? "cursor-pointer hover:bg-blue-100"
              : ""
          } ${isSelStart
            ? "bg-blue-500 text-white font-semibold ring-2 ring-blue-300"
            : isStart || isEnd
              ? "bg-blue-500 text-white font-semibold"
              : inRange
                ? "bg-blue-50 text-blue-700 font-medium"
                : isToday
                  ? "font-bold text-blue-600 ring-1 ring-blue-300"
                  : ""
          }`}
      >
        {day}
      </button>,
    );
  }

  return (
    <div className="w-[252px]">
      <div className="text-center text-sm font-semibold text-gray-800 mb-2">
        {formatMonthYear(year, month)}
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="w-8 h-6 flex items-center justify-center text-[11px] font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">{cells}</div>
    </div>
  );
};

// ----------------------------------------------------------------
// Main popover component
// ----------------------------------------------------------------

interface TimeFilterPopoverProps {
  value: TimeseriesMode;
  customRange?: DateRange;
  onChange: (mode: TimeseriesMode, customRange?: DateRange) => void;
}

const TimeFilterPopover: React.FC<TimeFilterPopoverProps> = ({ value, customRange, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);

  // Calendar view month (right calendar shows this month)
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Custom date picking state (null = not picking, Date = first click done)
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);

  // Compute displayed range for calendar highlights
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => resolveClientDateRange(value, customRange),
    [value, customRange],
  );

  // Previous month relative to the view month
  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;

  const navigateMonth = (direction: -1 | 1) => {
    setViewMonth((m) => {
      const next = m + direction;
      if (next < 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      if (next > 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return next;
    });
  };

  // Handle clicking a day on the calendar
  const handleDayClick = useCallback(
    (date: Date) => {
      if (selectionStart === null) {
        // First click — set start of custom range
        setSelectionStart(date);
      } else {
        // Second click — finalize the range
        const [start, end] = selectionStart <= date
          ? [selectionStart, date]
          : [date, selectionStart];
        setSelectionStart(null);
        onChange("custom", { start, end });
      }
    },
    [selectionStart, onChange],
  );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectionStart(null);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const key = e.key.toUpperCase();
      const matched = TIME_PRESETS.find((p) => p.shortcut === key);
      if (matched) {
        setSelectionStart(null);
        onChange(matched.value);
        setIsOpen(false);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setSelectionStart(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onChange]);

  // Button label
  const buttonLabel = value === "custom" && customRange
    ? `${formatDateShort(customRange.start)} – ${formatDateShort(customRange.end)}`
    : getPresetLabel(value);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${isOpen
            ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm ring-2 ring-blue-100"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 shadow-sm"
          }`}
      >
        <CalendarDays size={16} className={isOpen ? "text-blue-500" : "text-gray-400"} />
        <span>{buttonLabel}</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-500" : "text-gray-400"}`}
        />
      </button>

      {/* Popover dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-2xl z-50 flex overflow-hidden">
          {/* Left: Calendar panel */}
          <div className="p-4 border-r border-gray-100">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Two months side by side */}
            <div className="flex gap-6">
              <MiniCalendar
                year={prevYear}
                month={prevMonth}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                today={today}
                selectionStart={selectionStart}
                onDayClick={handleDayClick}
                interactive
              />
              <MiniCalendar
                year={viewYear}
                month={viewMonth}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                today={today}
                selectionStart={selectionStart}
                onDayClick={handleDayClick}
                interactive
              />
            </div>

            {/* Selection hint */}
            {selectionStart && (
              <p className="mt-3 text-xs text-blue-600 text-center">
                Select end date (max {MAX_CUSTOM_RANGE_DAYS} days)
              </p>
            )}
          </div>

          {/* Right: Preset options */}
          <div className="w-48 py-2">
            {TIME_PRESETS.map((preset) => {
              const isActive = preset.value === value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setSelectionStart(null);
                    onChange(preset.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <span>{preset.label}</span>
                  <kbd
                    className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold ${isActive
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-400"
                      }`}
                  >
                    {preset.shortcut}
                  </kbd>
                </button>
              );
            })}

            {/* Show custom as active when in custom mode */}
            {value === "custom" && customRange && (
              <div className="mx-3 mt-2 pt-2 border-t border-gray-100">
                <div className="px-1 py-1.5 text-xs text-blue-600 font-medium">
                  Custom range
                </div>
                <div className="px-1 text-xs text-gray-500">
                  {formatDateShort(customRange.start)} – {formatDateShort(customRange.end)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeFilterPopover;
