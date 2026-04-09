import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { AuthState } from '../store/useAuthStore';
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // use two simple selectors to avoid unstable snapshot warnings
  const isLoading = useAuthStore((s: AuthState) => s.isLoading);
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);

  if (isLoading) return <div className="h-screen flex items-center justify-center">Đang tải…</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default PublicRoute;
