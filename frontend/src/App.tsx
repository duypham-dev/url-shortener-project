// frontend/src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import './App.css';
// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
// Route guards
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import OAuthRedirect from './pages/OauthRedirect';
// Route guards implemented in separate components under `src/components`

const Dashboard = () => {
  const { logout } = useAuthStore();
  return <div className="p-8 text-2xl">Trang Dashboard (Đã bảo vệ)
    <button onClick={ () => logout()} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
    Logout
  </button>
  </div>;
};

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
        <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
        
        {/* Guest routes - Chỉ cho người chưa login */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/oauth/callback" element={<PublicRoute><OAuthRedirect /></PublicRoute>} />
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