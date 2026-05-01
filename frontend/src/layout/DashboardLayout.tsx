import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { usePlanStore } from '../store/usePlanStore';

interface DashboardLayoutProps {
  children?: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  // Fetch plan data once when the dashboard layout mounts.
  // This persists across all sub-routes (/dashboard, /dashboard/links, etc.)
  // and avoids redundant API calls on navigation.
  useEffect(() => {
    usePlanStore.getState().fetchPlan();
  }, []);

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      <Sidebar />
      
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        <Header />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children || <Outlet />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
