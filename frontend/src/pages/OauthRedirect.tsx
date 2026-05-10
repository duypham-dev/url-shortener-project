import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

/**
 * OAuth error messages mapping
 * Maps backend error codes to user-friendly messages
 */
const ERROR_MESSAGES = {
  missing_token: "Invalid token. Please try again.",
  csrf_invalid: "Invalid login session. Please try again.",
  account_banned: "Account is banned. Please contact administrator.",
  token_expired: "Login session expired. Please try again.",
  server_error: "Server error. Please try again later.",
  default: "Login failed. Please try again.",
};

/**
 * OAuth Redirect Handler Component
 */
const OAuthRedirect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const getUserProfile = useAuthStore((state) => state.checkAuth);

  // Prevent double execution in React StrictMode
  const hasProcessed = useRef(false);

  /**
   * Handle successful OAuth callback
   * Exchanges refresh token for access token
   */
  const handleOAuthSuccess = useCallback(
    async (accessToken: string) => {
      try {
        if (!accessToken) {
          throw new Error("No access token received");
        }

        // Store access token
        localStorage.setItem("accessToken", accessToken);

        // Fetch user profile to update auth context
        await getUserProfile();
        setStatus("success");
        // Redirect to home after brief success message
          navigate("/dashboard", { replace: true });
      } catch {
        setStatus("error");
        setErrorMessage("Authentication error. Please try again.");
        // Redirect to login
        navigate("/login", { replace: true });
      }
    },
    [navigate, getUserProfile],
  );

  /**
   * Handle OAuth error callback
   */
  const handleOAuthError = useCallback((messageCode: string | null) => {
    setStatus("error");
    setErrorMessage(
      (messageCode && ERROR_MESSAGES[messageCode as keyof typeof ERROR_MESSAGES]) ||
        ERROR_MESSAGES.default
    );
    // Redirect to login
    navigate("/login", { replace: true });
  }, [navigate]);

  /**
   * Process OAuth callback on mount
   */
  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const oauthStatus = searchParams.get("oauth");
    const token = searchParams.get("token");

    if (oauthStatus === "success") {
      if (token) {
        handleOAuthSuccess(token);
      }else{
        setStatus("error");
        setErrorMessage("No token received. Please try again.");
      }
    } else {
      const messageCode: string | null = searchParams.get("message");
      handleOAuthError(messageCode);
    }
  }, [ searchParams, handleOAuthSuccess, handleOAuthError]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Loading State */}
      {status === "loading" && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4 mx-auto" />
          <p className="text-gray-600 dark:text-gray-300">
            Processing login...
          </p>
        </div>
      )}

      {/* Success State */}
      {status === "success" && (
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4 mx-auto">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-green-600 dark:text-green-400 font-medium text-lg">
            Login successful!
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Redirecting...
          </p>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full mb-4 mx-auto">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium text-lg">
            Login Failed
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
