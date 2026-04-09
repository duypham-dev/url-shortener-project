// frontend/src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import './App.css';
// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import api from "./config/apiConfig";
// Tạo một component bọc (Wrapper) cho các Private Routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Component bọc để ngăn User đã login vào lại trang Login/Register
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) return <div className="h-screen flex items-center justify-center">Đang tải...</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

const Dashboard = () => {
  const { logout } = useAuthStore();
  return <div className="p-8 text-2xl">Trang Dashboard (Đã bảo vệ)
    <button onClick={ () => logout()} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
    Logout
  </button>
  </div>;
};

const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  // Kiểm tra trạng thái đăng nhập ngay khi ứng dụng mount (F5)
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - Ai cũng vào được */}
        <Route path="/" element={<Home />} />
        
        {/* Guest routes - Chỉ cho người chưa login */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Private routes - Yêu cầu login */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;