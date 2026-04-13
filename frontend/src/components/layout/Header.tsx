import React from 'react';
import { Search, HelpCircle, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Left section empty for spacing or mobile menu */}
      <div className="flex-1 flex items-center">
        {/* Mobile menu button could go here */}
      </div>

      {/* Center/Search (if needed, but usually on the right) */}
      <div className="flex-1 max-w-lg hidden md:flex items-center">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm"
            placeholder="Search..."
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex-1 flex items-center justify-end gap-4 ml-6">
        <button className="hidden sm:inline-flex bg-[#00a99d] hover:bg-[#009188] text-white text-sm font-medium px-4 py-2 rounded shadow-sm transition-colors">
          Upgrade
        </button>
        
        <div className="flex items-center gap-3 text-gray-500">
          <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <HelpCircle size={20} />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <Zap size={20} />
          </button>

          {/* User UserDropdown */}
          <div className="relative ml-2 flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-sm">
              {user?.username ? user.username.charAt(0).toUpperCase() : 'P'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block flex-1 truncate max-w-[120px]">
              {user?.username || 'Phạm Phúc Duy'}
            </span>
            <button 
              onClick={() => logout()}
              className="text-xs text-red-500 hover:text-red-700 ml-2"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
