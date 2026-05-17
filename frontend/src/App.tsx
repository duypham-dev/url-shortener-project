// frontend/src/App.tsx
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from "./store/useAuthStore";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});
// Route guards
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

// Pages
import Home from "./pages/HomePage/HomePage.tsx";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import OAuthRedirect from "./pages/OauthRedirect";
import Dashboard from "./pages/Home/Home.tsx";
import { DashboardLayout } from "./layout/DashboardLayout";
import { Links } from "./pages/Links/Links.tsx";
import { Upgrade } from "./pages/Upgrade";
import { PaymentResult } from "./pages/PaymentSuccess";
import { LinkAnalytics } from "./pages/LinkAnalytics/LinkAnalytics.tsx";
import CreateLink from "./pages/CreateLink/CreateLink";
import { RealtimeAnalytics } from "./pages/RealtimeAnalytics.tsx";
import { QrCodes } from "./pages/QrList/QrCodes.tsx";
import { Toaster } from "react-hot-toast";
import { GlobalConfirmModal } from "./components/GlobalConfirmModal";
import { ThemeProvider } from "./components/ThemeProvider";
import { SettingsLayout } from "./pages/Settings/SettingsLayout";
import { GeneralSettings } from "./pages/Settings/GeneralSettings";
import { AccountSettings } from "./pages/Settings/AccountSettings";

const App: React.FC = () => {
  // Kiểm tra trạng thái đăng nhập ngay khi ứng dụng mount (F5)
  // Call via getState to avoid subscribing to the function reference
  useEffect(() => {
    useAuthStore.getState().checkAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Toaster position="top-center" />
        <BrowserRouter>
        <Routes>
          {/* Public routes - Ai cũng vào được */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Home />
              </PublicRoute>
            }
          />

          {/* Guest routes - Chỉ cho người chưa login */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/oauth/callback"
            element={
              <PublicRoute>
                <OAuthRedirect />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />
          {/* Private routes - Yêu cầu login */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="links" element={<Links />} />
            <Route path="links/create" element={<CreateLink />} />
            <Route path="links/:shortCode/analytics" element={<LinkAnalytics />} />
            <Route path="qr" element={<QrCodes />} />
            <Route path="pages" element={<p>pages page</p>} />
            <Route path="analytics" element={<RealtimeAnalytics />} />
            <Route path="campaigns" element={<p>campaigns page</p>} />
            <Route path="domains" element={<p>domains page</p>} />
            <Route path="integrations" element={<p>integrations page</p>} />
            <Route path="upgrade" element={<Upgrade />} />
          </Route>

          {/* Settings Route (Separate Layout) */}
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <SettingsLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="account" element={<AccountSettings />} />
          </Route>

          {/* Kết quả thanh toán */}
          <Route path="/payment-success" element={<PaymentResult />} />
        </Routes>
        <GlobalConfirmModal />
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
