import axios from 'axios';

// Create a configured axios instance
export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  timeout: 20000, // 20 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending/receiving httpOnly cookies (refresh token)
});

// Request interceptor: Attach access token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Prevent browser from serving cached GET responses (helps when user navigates back)
    // const method = (config.method || '').toString().toLowerCase();
    // if (method === 'get') {
    //   if (!config.headers) config.headers = {} as any;
    //   config.headers['Cache-Control'] = 'no-cache, no-store';
    //   config.headers['Pragma'] = 'no-cache';
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle token expiration
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Fixed a potential infinite loop by checking _retry flag
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we are already refreshing, put failing requests in queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint with axios directly to avoid interceptor loops
        const { data } = await axios.post(
          `${axiosClient.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.data.accessToken;
        
        // Save new token to local storage
        localStorage.setItem('accessToken', newAccessToken);

        // Update default header
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        // Process queue with new token
        processQueue(null, newAccessToken);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clean up tokens
        localStorage.removeItem('accessToken');
        
        // Chỉ redirect tự động nếu không phải đang ở trang login rễ để tránh loop
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/' && !window.location.pathname.startsWith('/oauth/callback')) {
           window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);
