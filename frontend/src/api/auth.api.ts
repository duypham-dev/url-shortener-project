import { axiosClient } from '../config/axiosClient';
import type {
  AuthApiResponse,
  LoginInput,
  MeApiResponse,
  RegisterInput,
} from '../types/auth.type';
 
// Register new user
export const registerApi = (data: RegisterInput): Promise<AuthApiResponse> =>
  axiosClient.post('/auth/register', data);
 
// Login with email and password
export const loginApi = (data: LoginInput): Promise<AuthApiResponse> =>
  axiosClient.post('/auth/login', data);
 
// Logout — remove refreshToken on server + blacklist accessToken
export const logoutApi = (): Promise<{ success: boolean }> =>
  axiosClient.post('/auth/logout');
 
// Get current user info (used for auto-login on app start)
export const getMeApi = (): Promise<MeApiResponse> =>
  axiosClient.get('/auth/me');

// Forgot password
export const forgotPasswordApi = (data: { email: string }): Promise<{ success: boolean; message: string }> =>
  axiosClient.post('/auth/forgot-password', data);

// Reset password
export const resetPasswordApi = (data: { token: string; newPassword: string }): Promise<{ success: boolean; message: string }> =>
  axiosClient.post('/auth/reset-password', data);
