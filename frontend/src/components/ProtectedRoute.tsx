import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { shallow } from 'zustand/shallow';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuthStore(
    (s) => ({ isAuthenticated: s.isAuthenticated, isLoading: s.isLoading }),
    shallow
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">Đang tải…</div>
    );
  }

  if (!isAuthenticated) {
    // Preserve attempted location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
