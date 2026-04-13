import React from 'react';
import { NavLink } from 'react-router-dom';
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
  ChevronLeft
} from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  end?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, badge, end }) => {
  return (
   <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        /* Thêm 'relative' làm gốc tọa độ cho thanh xanh */
        `relative flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-700 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-blue-700 before:rounded-full'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <div className="flex items-center gap-3">
        {/* Đã xóa thẻ span trống bị dư ở đây */}
        {icon}
        <span>{label}</span>  
      </div>
      {badge && (
        <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
          {badge}
        </span>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-gray-200 bg-white h-screen flex flex-col pt-4 relative hidden md:flex flex-shrink-0">
      {/* Logo Area */}
      <div className="px-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#ff6116] font-bold text-xl">
          <div className="w-8 h-8 rounded-full bg-[#ff6116] flex items-center justify-center text-white">
            <span className="text-lg">b</span>
          </div>
        </div>
        
        {/* Collapse Button */}
        <button className="absolute -right-3 top-5 w-6 h-6 border bg-white border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm z-10 transition-transform">
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Create Button */}
      <div className="px-4 mb-4">
        <button className="w-full bg-[#0a2540] hover:bg-[#113a63] text-white font-medium py-2.5 px-4 rounded transition-colors text-sm">
          Create new
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        <NavItem to="/dashboard" icon={<Home size={18} />} label="Home" end />
        <NavItem to="/dashboard/links" icon={<LinkIcon size={18} />} label="Links" />
        <NavItem to="/dashboard/qr" icon={<QrCode size={18} />} label="QR Codes" badge="Try It" />
        <NavItem to="/dashboard/pages" icon={<FileText size={18} />} label="Pages" badge="Try It" />
        <NavItem to="/dashboard/analytics" icon={<BarChart2 size={18} />} label="Analytics" badge="Try It" />
        <NavItem to="/dashboard/campaigns" icon={<FolderOpen size={18} />} label="Campaigns" />
        <NavItem to="/dashboard/domains" icon={<Globe size={18} />} label="Custom domains" />
        <NavItem to="/dashboard/integrations" icon={<Blocks size={18} />} label="Integrations" />
        <div className="pt-4 mt-2 border-t border-gray-100">
          <NavItem to="/dashboard/settings" icon={<Settings size={18} />} label="Settings" />
        </div>
      </nav>
    </aside>
  );
};
