import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Link as LinkIcon,
  QrCode,
  FileText,
  BarChart2,
  FolderOpen,
  Globe,
  Blocks,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  end?: boolean;
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  to,
  icon,
  label,
  end,
  isCollapsed,
}) => {
  return (
    <NavLink
      to={to}
      end={end}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex items-center rounded-md text-sm font-medium transition-colors duration-200 px-3 py-2.5 overflow-hidden ${
          isActive
            ? "bg-blue-100 text-blue-700 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-blue-700 before:rounded-full"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        }`
      }
    >
      <div className="flex items-center w-full gap-3">
        <div className="flex shrink-0 items-center justify-center w-5 h-5">
          {icon}
        </div>
        {isCollapsed ? null : (
          <span
            className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out `}
          >
            {label}
          </span>
        )}
      </div>
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`border-r border-gray-200 bg-white h-screen flex flex-col pt-4 px-3 relative md:flex shrink-0 transition-[width] duration-300 ease-in-out ${
        isCollapsed ? "w-18" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="mb-6 flex items-center px-2">
        <div className="w-8 h-8 rounded-full bg-[#ff6116] flex items-center justify-center text-white shrink-0 ml-0.5">
          <span className="text-lg font-bold">b</span>
        </div>
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 w-8 h-8 border bg-white border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm z-90"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Create Button */}
      <div className="mt-5 mb-4">
        <button className="w-full h-10 bg-[#0a2540] hover:bg-[#113a63] text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center">
          {isCollapsed ? (
            <Plus size={16} />
          ) : (
            <span
              className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                isCollapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-2"
              }`}
            >
              Create new
            </span>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto mt-2 space-y-0.5`}>
        <NavItem
          isCollapsed={isCollapsed}
          to="/dashboard"
          icon={<Home size={18} />}
          label="Home"
          end
        />
        <NavItem
          isCollapsed={isCollapsed}
          to="/dashboard/links"
          icon={<LinkIcon size={18} />}
          label="Links"
        />
        <NavItem
          isCollapsed={isCollapsed}
          to="/dashboard/qr"
          icon={<QrCode size={18} />}
          label="QR Codes"
        />
        <NavItem
          isCollapsed={isCollapsed}
          to="/dashboard/analytics"
          icon={<BarChart2 size={18} />}
          label="Click Stream"
        />
      
        <div className="pt-4 mt-2 border-t border-gray-100">
          <NavItem
            isCollapsed={isCollapsed}
            to="/dashboard/settings"
            icon={<Settings size={18} />}
            label="Settings"
          />
        </div>
      </nav>
    </aside>
  );
};
