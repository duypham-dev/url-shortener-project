/**
 * axiosClient.ts
 * Axios instance được cấu hình sẵn cho toàn bộ app.
 *
 * Interceptors:
 * - Request: tự động đính kèm accessToken từ localStorage
 * - Response (success): unwrap response.data → caller nhận API body trực tiếp
 * - Response (error 401): thử refresh token 1 lần, queue các request bị lỗi,
 *   sau đó retry tất cả với token mới. Nếu refresh thất bại thì clear session.
 */
import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { RefreshApiResponse } from '../types/auth.type';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Bắt buộc để gửi/nhận httpOnly cookie chứa refreshToken
});

// ============================================================
// Request Interceptor — đính kèm Bearer token
// ============================================================
axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// Response Interceptor — unwrap data + xử lý token hết hạn
// ============================================================

// Cờ kiểm tra đang refresh hay chưa, tránh gọi /refresh nhiều lần đồng thời
let isRefreshing = false;

// Queue chứa các request bị 401 trong lúc đang refresh
type QueueItem = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else {
      item.resolve(token!);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  // ---- Success: trả về API body trực tiếp thay vì AxiosResponse ----
  (response) => response.data,

  // ---- Error: xử lý 401 với token rotation ----
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Không phải 401, hoặc đã retry rồi → reject luôn
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error.response?.data ?? error);
    }

    // Nếu đang trong quá trình refresh → thêm vào queue và chờ
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Dùng axios thuần để tránh đệ quy qua interceptor
      const { data } = await axios.post<RefreshApiResponse>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken = data.data.accessToken;

      // Cập nhật token mới
      localStorage.setItem('accessToken', newToken);
      axiosClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      // Retry tất cả request trong queue với token mới
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      // Refresh thất bại → xóa session
      processQueue(refreshError, null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');

      // Redirect về login nếu đang ở protected route
      const currentPath = window.location.pathname;
      const isPublicPath = ['/', '/login', '/register'].includes(currentPath) ||
        currentPath.startsWith('/oauth/');

      if (!isPublicPath) {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);