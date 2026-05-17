import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Settings, User } from 'lucide-react';
import { Sidebar } from '../../layout/Sidebar';
import { Header } from '../../layout/Header';

export const SettingsLayout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { name: 'General', path: '/dashboard/settings/general', icon: <Settings size={18} /> },
    { name: 'Account', path: '/dashboard/settings/account', icon: <User size={18} /> },
  ];

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden font-sans transition-colors">
      
      {/* Main App Sidebar */}
      <Sidebar />
      
      {/* Content wrapper taking remaining width */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        
        {/* Top Header spans across Sub-sidebar and Main Content */}
        <Header />
        
        {/* Lower body container containing Sub-sidebar and Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Settings Sub-sidebar */}
          <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/50 flex flex-col overflow-y-auto transition-colors">
            <div className="p-6">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
              
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <NavLink
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}>
                        {item.icon}
                      </span>
                      {item.name}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none bg-white dark:bg-gray-900 transition-colors">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8">
              <Outlet />
            </div>
          </main>

        </div>
      </div>
    </div>
  );
};
