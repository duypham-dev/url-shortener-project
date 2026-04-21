import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Search, Trash2, Wifi, WifiOff } from "lucide-react";
import { createClickStream } from "../api/analytics.api";
import type { ClickStreamPayload } from "../types/analytics.type";

type ConnectionState = "connecting" | "connected" | "error";

type RealtimeClickRow = ClickStreamPayload & {
  eventId: string;
};

const MAX_BUFFERED_EVENTS = 200;

const isClickStreamPayload = (value: unknown): value is ClickStreamPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<ClickStreamPayload>;

  return (
    typeof payload.shortCode === "string" &&
    typeof payload.longUrl === "string" &&
    typeof payload.ip === "string" &&
    typeof payload.userAgent === "string" &&
    typeof payload.timestamp === "string" &&
    typeof payload.urlMappingId === "string" &&
    typeof payload.userId === "number" &&
    typeof payload.deviceType === "string"
  );
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("vi-VN", { hour12: false });
};

const formatReferrer = (value: string | null): string => {
  if (!value || value.trim().length === 0) {
    return "Direct";
  }

  return value;
};

export const RealtimeAnalytics: React.FC = () => {
  const accessToken = localStorage.getItem("accessToken");
  const [events, setEvents] = useState<RealtimeClickRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ConnectionState>(
    accessToken ? "connecting" : "error",
  );
  const [statusMessage, setStatusMessage] = useState(
    accessToken
      ? "Đang kết nối luồng realtime..."
      : "Không tìm thấy access token. Vui lòng đăng nhập lại.",
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const stream = createClickStream(accessToken);

    const handleConnected = () => {
      setStatus("connected");
      setStatusMessage("Kết nối thành công. Đang lắng nghe sự kiện click.");
    };

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as unknown;

        if (!isClickStreamPayload(payload)) {
          return;
        }

        const eventId = `${payload.urlMappingId}-${payload.timestamp}-${Math.random().toString(36).slice(2, 8)}`;
        const nextEvent: RealtimeClickRow = {
          ...payload,
          eventId,
        };

        setEvents((prev) => [nextEvent, ...prev].slice(0, MAX_BUFFERED_EVENTS));
        setStatus("connected");
        setStatusMessage("Đang nhận sự kiện click realtime.");
      } catch {
        // Ignore malformed payloads to keep stream alive.
      }
    };

    const handleError = () => {
      setStatus("error");
      setStatusMessage("Kết nối gián đoạn. Trình duyệt đang tự động thử kết nối lại...");
    };

    stream.addEventListener("connected", handleConnected);
    stream.onopen = handleConnected;
    stream.onmessage = handleMessage;
    stream.onerror = handleError;

    return () => {
      stream.removeEventListener("connected", handleConnected);
      stream.onopen = null;
      stream.onmessage = null;
      stream.onerror = null;
      stream.close();
    };
  }, [accessToken]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return events;
    }

    return events.filter((item) => {
      const searchable = [
        item.shortCode,
        item.ip,
        item.browser ?? "",
        item.os ?? "",
        item.deviceType,
        item.referrer ?? "",
        item.longUrl,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [events, search]);

  const statusBadge =
    status === "connected"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "connecting"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  const statusIcon =
    status === "connected" ? <Wifi size={16} /> : <WifiOff size={16} />;

  return (
    <div className="py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Realtime Click Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bảng sự kiện click trực tiếp cho toàn bộ link của bạn (tối đa {MAX_BUFFERED_EVENTS} bản ghi gần nhất).
          </p>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${statusBadge}`}>
          {statusIcon}
          <span>{statusMessage}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Tổng sự kiện trong phiên</div>
          <div className="text-3xl font-bold text-gray-900">{events.length}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Sự kiện hiển thị</div>
          <div className="text-3xl font-bold text-gray-900">{filteredEvents.length}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Sự kiện mới nhất</div>
          <div className="text-sm font-semibold text-gray-900 mt-1">
            {events[0] ? formatDateTime(events[0].timestamp) : "Chưa có dữ liệu"}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 p-4 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Lọc theo short code, IP, browser, referrer..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setEvents([])}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Trash2 size={14} />
            Xóa bảng
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Thời gian</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Short link</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nguồn truy cập</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Thiết bị</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">IP</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">URL đích</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Activity size={20} className="text-gray-400" />
                      <div>Chưa có sự kiện click realtime.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((item) => (
                  <tr key={item.eventId} className="border-b border-gray-100 hover:bg-gray-50/70">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateTime(item.timestamp)}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/dashboard/links/${item.shortCode}/analytics`}
                        className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                      >
                        /{item.shortCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={formatReferrer(item.referrer)}>
                      {formatReferrer(item.referrer)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {(item.browser ?? "Unknown") + " / " + (item.os ?? "Unknown") + " / " + item.deviceType}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{item.ip}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-md truncate" title={item.longUrl}>
                      {item.longUrl}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RealtimeAnalytics;
