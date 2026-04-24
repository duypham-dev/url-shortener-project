import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, HelpCircle, Zap } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePlanStore, selectIsVip, selectPlanName } from '../store/usePlanStore';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const isVip = usePlanStore(selectIsVip);
  const planName = usePlanStore(selectPlanName);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0  z-20">
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
        {/* Only show Upgrade button for free-tier users */}
        {!isVip && (
          <button 
            onClick={() => navigate('/dashboard/upgrade')}
            className="hidden sm:inline-flex bg-[#00a99d] hover:bg-[#009188] text-white text-sm font-medium px-4 py-2 rounded shadow-sm transition-colors"
          >
            Upgrade
          </button>
        )}
        
        <div className="flex items-center gap-3 text-gray-500">
          <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <HelpCircle size={20} />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <Zap size={20} />
          </button>

          {/* User Dropdown */}
          <div className="relative ml-2" ref={dropdownRef}>
            <div 
              className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-gray-50"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-[#202b3c] flex items-center justify-center text-white font-medium text-sm">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'O'}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block flex-1 max-w-[120px] truncate">
                {user?.fullName || 'o_34h76e8osl'}
              </span>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-50 text-gray-800">
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-[#202b3c] flex items-center justify-center text-white text-lg font-medium shrink-0">
                      {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'O'}
                   </div>
                   <div className="overflow-hidden">
                     <div className="font-medium text-base truncate">{user?.fullName || 'o_34h76e8osl'}</div>
                     <div className="text-sm text-gray-500 truncate">{user?.email || 'ppduy01@gmail.com'}</div>
                   </div>
                </div>

                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                   <div className="overflow-hidden pr-2">
                     <div className="font-medium text-base truncate">{user?.fullName || 'o_34h76e8osl'}</div>
                     <div className="text-sm text-gray-500">{planName} account</div>
                   </div>
                   {!isVip && (
                     <button 
                       onClick={() => {
                          setIsDropdownOpen(false);
                          navigate('/dashboard/upgrade');
                       }}
                       className="bg-[#00a99d] hover:bg-[#009188] text-white text-sm font-medium px-3 py-1.5 rounded transition-colors shrink-0"
                     >
                       Upgrade
                     </button>
                   )}
                   {isVip && (
                     <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                       <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                       Active
                     </span>
                   )}
                </div>

                <div className="py-2 border-b border-gray-100">
                   <a href="#" className="block px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">Support</a>
                   <a href="#" className="block px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">API documentation</a>
                   <a href="#" className="block px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">Bitly Terms</a>
                </div>

                <div className="py-2">
                   <button 
                     onClick={() => {
                       logout();
                       setIsDropdownOpen(false);
                     }} 
                     className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                   >
                     Sign out
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
