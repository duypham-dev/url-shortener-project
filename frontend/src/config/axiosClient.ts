import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { RefreshApiResponse } from '../types/auth.type';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const axiosClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Mandatory for refresh token cookie
});

// ============================================================
// Request Interceptor — auto attach access token from localStorage
// ============================================================
axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================
// Response Interceptor — unwrap data + handle 401 with token rotation
// ============================================================

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;

// Queue contain pending requests while refresh in progress
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
  // ---- Success: return API body directly ----
  (response) => response.data,

  // ---- Error: handle 401 with token rotation ----
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is not 401 or retry already attempted → reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error.response?.data ?? error);
    }

    // If refresh already in progress, queue the request and retry after refresh completes
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
      // Call refresh endpoint to get new access token
      const { data } = await axios.post<RefreshApiResponse>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken = data.data.accessToken;

      // Update new token in localStorage and default headers
      localStorage.setItem('accessToken', newToken);
      axiosClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      // Retry all failed requests in the queue with the new token
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed → remove session
      processQueue(refreshError, null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');

      // Redirect to login if currently on a protected route
      const currentPath = window.location.pathname;
      const isPublicPath = ['/', '/login', '/register', '/payment-success'].includes(currentPath) ||
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