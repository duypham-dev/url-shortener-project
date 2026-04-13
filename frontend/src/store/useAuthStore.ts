import { create } from 'zustand';
import { axiosClient } from '../config/axiosClient';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean; // For initial auth check
  login: (userData: User, accessToken: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true, // start loading to check auth on mount
  
  login: (userData, accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    set({ isAuthenticated: true, user: userData });
  },

  logout: async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      localStorage.removeItem('accessToken');
      set({ isAuthenticated: false, user: null });
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const response: any = await axiosClient.get('/auth/me');
      console.log('Auth check response:', response);
      if (response && response.success) {
        set({ isAuthenticated: true, user: response.data.user });
      }
    } catch (error) {
      // Error handles refresh logic in interceptor automatically.
      // If still fails, interceptor clears token.
      set({ isAuthenticated: false, user: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));
