import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full relative z-10 bg-white/50 backdrop-blur-sm border-b border-gray-100/50">
      <div className="flex flex-1 items-center">
        <Link to="/" className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
          <div className="w-8 h-8 bg-black rounded-full grid place-items-center">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          dub
        </Link>
      </div>
      <div className="hidden md:flex items-center justify-center gap-6 text-sm font-medium text-gray-600">
        <button className="flex items-center gap-1 hover:text-black transition-colors">
          Product <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        <button className="flex items-center gap-1 hover:text-black transition-colors">
          Solutions <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        <button className="flex items-center gap-1 hover:text-black transition-colors">
          Resources <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        <Link to="/enterprise" className="hover:text-black transition-colors">
          Enterprise
        </Link>
        <Link to="/customers" className="hover:text-black transition-colors">
          Customers
        </Link>
        <Link to="/pricing" className="hover:text-black transition-colors">
          Pricing
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-end gap-4">
        <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
          Log in
        </Link>
        <Link to="/register" className="text-sm font-medium bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
          Sign up
        </Link>
      </div>
    </nav>
  );
}
