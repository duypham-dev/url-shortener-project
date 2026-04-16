import { create } from "zustand";
import { getMeApi, logoutApi } from '../api/auth.api';
import type { User } from "../types/auth.type";
import { usePlanStore } from './usePlanStore';


export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean; // For initial auth check
  login: (userData: User, accessToken: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// ============================================================
// Helper: lưu/đọc user từ localStorage
// ============================================================
const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  USER: "user",
} as const;

const persistUser = (user: User, accessToken: string): void => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

const clearSession = (): void => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true, // start loading to check auth on mount

  login: (user, accessToken) => {
    persistUser(user, accessToken);
    set({ isAuthenticated: true, user });
  },

  logout: async () => {
    try {
      await logoutApi();
    } catch {
      // Dù server lỗi vẫn phải clear local session
    } finally {
      clearSession();
      usePlanStore.getState().reset();
      set({ isAuthenticated: false, user: null });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
 
    // If no token, user is not authenticated
    if (!token) {
      set({ isAuthenticated: false, user: null, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      
      const response = await getMeApi();

      if (response && response.success) {
        set({ isAuthenticated: true, user: response.data.user });
      }
      
    } catch {
      // If still fails, interceptor clears token.
      clearSession();
      set({ isAuthenticated: false, user: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));
