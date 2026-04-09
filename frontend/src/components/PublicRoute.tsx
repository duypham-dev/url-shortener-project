import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { shallow } from 'zustand/shallow';

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore(
    (s) => ({ isAuthenticated: s.isAuthenticated, isLoading: s.isLoading }),
    shallow
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center">Đang tải…</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default PublicRoute;
