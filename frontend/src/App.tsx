// frontend/src/App.tsx
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import "./App.css";
// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
// Route guards
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import OAuthRedirect from "./pages/OauthRedirect";
import Dashboard from "./pages/Dashboard";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Links } from "./pages/Links";
import { Upgrade } from "./pages/Upgrade";
import { PaymentResult } from "./pages/PaymentSuccess";
import { LinkAnalytics } from "./pages/LinkAnalytics";

const App: React.FC = () => {
  // Kiểm tra trạng thái đăng nhập ngay khi ứng dụng mount (F5)
  // Call via getState to avoid subscribing to the function reference
  useEffect(() => {
    useAuthStore.getState().checkAuth();
  }, []);

  return (
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
          <Route path="links/:shortCode/analytics" element={<LinkAnalytics />} />
          <Route path="qr" element={<p>qr page</p>} />
          <Route path="pages" element={<p>pages page</p>} />
          <Route path="analytics" element={<p>analytics page</p>} />
          <Route path="campaigns" element={<p>campaigns page</p>} />
          <Route path="domains" element={<p>domains page</p>} />
          <Route path="integrations" element={<p>integrations page</p>} />
          <Route path="settings" element={<p>settings page</p>} />
          <Route path="upgrade" element={<Upgrade />} />
        </Route>
        
        {/* Kết quả thanh toán */}
        <Route path="/payment-success" element={<PaymentResult />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
