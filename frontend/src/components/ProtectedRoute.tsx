import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { AuthState } from '../store/useAuthStore';
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  // use two simple selectors to avoid unstable snapshot warnings
  const isLoading = useAuthStore((s: AuthState) => s.isLoading);
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);

  if (isLoading) return <div className="h-screen flex items-center justify-center">Đang tải…</div>;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
