import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';

// import useAuth from '../../hooks/useAuth';
// import api from '../../config/ApiConfig';
// import { setAuthData } from '../../utils/storage';

/**
 * OAuth error messages mapping
 * Maps backend error codes to user-friendly messages
 */
const ERROR_MESSAGES = {
  missing_token: 'Token không hợp lệ. Vui lòng thử lại.',
  csrf_invalid: 'Phiên đăng nhập không hợp lệ. Vui lòng thử lại.',
  account_banned: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  token_expired: 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.',
  server_error: 'Lỗi máy chủ. Vui lòng thử lại sau.',
  default: 'Đăng nhập thất bại. Vui lòng thử lại.',
};

/**
 * OAuth Redirect Handler Component
 * 
 * Handles the callback from OAuth provider (Google).
 * The backend redirects here after successful Google authentication.
 * 
 * Flow:
 * 1. Backend sets refresh token in HttpOnly cookie
 * 2. Backend redirects here with oauth=success
 * 3. This component calls /auth/refresh to get access token
 * 4. Stores access token and fetches user profile
 * 5. Redirects to home page
 * 
 * Error handling:
 * - oauth=error with message param: Display error and redirect
 * - Refresh token failure: Clear auth and redirect to login
 */
const OAuthRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
//   const setAuthData = useAuthStore((state) => state.login);

  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const getUserProfile = useAuthStore((state) => state.checkAuth);
  // Prevent double execution in React StrictMode
  const hasProcessed = useRef(false);

  /**
   * Get user-friendly error message from error code
   */
//   const getErrorMessage = useCallback((code) => {
//     return ERROR_MESSAGES[code] || ERROR_MESSAGES.default;
//   }, []);

  /**
   * Handle successful OAuth callback
   * Exchanges refresh token for access token
   */
  const handleOAuthSuccess = useCallback(async () => {
    try {
      // Call refresh endpoint to exchange cookie-based refresh token for access token
      const response = await axiosClient.post('/auth/refresh');
      const accessToken = response?.data.accessToken || response?.data?.accessToken;
      
      if (!accessToken) {
        throw new Error('No access token received');
      }
      
      // Store access token (refresh token is in HttpOnly cookie)
        localStorage.setItem('accessToken', accessToken);
      
      // Fetch user profile to update auth context
      await getUserProfile();
      
      setStatus('success');
      
      // Redirect to home after brief success message
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
      
    } catch (err) {
      console.error('OAuth token exchange failed:', err);
      setStatus('error');
      setErrorMessage("errror tesst");
      
      // Redirect to home after showing error
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    }
  }, [navigate, getUserProfile]);

  /**
   * Handle OAuth error callback
   */
  const handleOAuthError = useCallback(() => {
    setStatus('error');
    setErrorMessage("errror tesst");
    
    // Redirect to home after showing error
    setTimeout(() => {
      navigate('/', { replace: true });
    }, 2000);
  }, [navigate]);

  /**
   * Process OAuth callback on mount
   */
  useEffect(() => {
    // Prevent double execution
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const oauthStatus = searchParams.get('oauth');
    const token = searchParams.get('token');
    // const errorCode = searchParams.get('message');

    if (oauthStatus === 'success') {
      if (token) {
        // Bỏ qua gọi lại /auth/refresh, dùng luôn accessToken từ URL
        localStorage.setItem('accessToken', token);
        
        getUserProfile()
          .then(() => {
            setStatus('success');
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 1000);
          })
          .catch((err) => {
            setStatus('error');
            setErrorMessage('Lỗi xác thực người dùng');
            setTimeout(() => {
              navigate('/login', { replace: true });
            }, 2000);
          });
      } else {
        handleOAuthSuccess();
      }
    } else {
      handleOAuthError();
    }
  }, [searchParams, handleOAuthSuccess, handleOAuthError, getUserProfile, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Loading State */}
      {status === 'loading' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4 mx-auto" />
          <p className="text-gray-600 dark:text-gray-300">Đang xử lý đăng nhập...</p>
        </div>
      )}
      
      {/* Success State */}
      {status === 'success' && (
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4 mx-auto">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-600 dark:text-green-400 font-medium text-lg">
            Đăng nhập thành công!
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Đang chuyển hướng...
          </p>
        </div>
      )}
      
      {/* Error State */}
      {status === 'error' && (
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full mb-4 mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium text-lg">
            Đăng nhập thất bại
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
};

export default OAuthRedirect;
