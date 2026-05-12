import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scissors, Menu, X, ArrowRight, Check, Copy, Zap, Shield, BarChart3, ChevronDown, Link2, CheckCircle2 } from "lucide-react";
import { createShortenUrl } from "../api/link.api";

const Home: React.FC = () => {
  const [url, setUrl] = useState<string>("");
  const [shortenedUrl, setShortenedUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setIsCopied(false);

    try {
      const data = await createShortenUrl(url);
      setShortenedUrl(data.shortUrl);
    } catch (error) {
      console.error("Link shortening error: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shortenedUrl) return;
    try {
      await navigator.clipboard.writeText(shortenedUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Copy error: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#10141a] text-white font-sans  8]/30">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen pointer-events-none"
        style={{ backgroundImage: "url('/background.jpg')" }}
      ></div>
      
      {/* Navbar */}
      <nav className="relative z-50 border-b border-white/5 bg-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <Scissors className="h-6 w-6 text-white" />
              <span className="text-xl font-bold tracking-tight text-white">
                ShortLink
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <div className="flex items-center gap-1 cursor-pointer hover:text-white text-slate-300 transition-colors">
                <span className="text-sm font-medium">Products</span>
                <ChevronDown className="w-4 h-4" />
              </div>
              <Link to="#benefit" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Benefit
              </Link>
              <Link to="#how-it-works" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                How it Works
              </Link>
              <Link to="/pricing" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Pricing
              </Link>
              <div className="flex items-center gap-1 cursor-pointer hover:text-white text-slate-300 transition-colors">
                <span className="text-sm font-medium">Company</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-white hover:text-slate-200 transition-colors">
                Login
              </Link>
              <Link to="/register" className="bg-[#7041f4] text-white px-5 py-2.5 rounded-full text-[14px] font-bold hover:bg-[#5b32cc] transition-all transform hover:scale-105 shadow-lg shadow-[#7041f4]/20">
                Get Started
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white hover:text-slate-300">
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-20 left-0 w-full bg-[#10141a] border-b border-white/5 py-4 px-4 flex flex-col gap-4 z-50">
              <Link to="#products" className="text-base font-medium text-slate-300">Products</Link>
              <Link to="#benefit" className="text-base font-medium text-slate-300">Benefit</Link>
              <Link to="/pricing" className="text-base font-medium text-slate-300">Pricing</Link>
              <Link to="/login" className="text-base font-medium text-white">Login</Link>
              <Link to="/register" className="bg-[#7041f4] text-white text-center py-3 rounded-xl font-bold">Get Started</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-20 pb-16 lg:pt-24 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          
          <h1 className="mx-auto max-w-4xl text-5xl md:text-6xl lg:text-[72px] font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
            All your powerful links in one place.
          </h1>
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-slate-300 mb-10 leading-relaxed font-light">
            Your one-stop link management platform.<br className="hidden md:block"/>
            Create, manage and track your links with our superfast app.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in-up">
            <button onClick={() => {
                const el = document.getElementById("shorten-box");
                el?.scrollIntoView({ behavior: 'smooth' });
              }} 
              className="w-full sm:w-auto bg-[#7041f4] text-white px-8 py-3.5 rounded-full text-[15px] font-bold hover:bg-[#5b32cc] transition-all transform hover:scale-105 shadow-xl shadow-[#7041f4]/20">
              Get a Free Link
            </button>
            <Link to="/pricing" className="w-full sm:w-auto bg-[#2C3138] text-white hover:bg-[#3B4048] px-8 py-3.5 rounded-full text-[15px] font-bold transition-all">
              See Pricing
            </Link>
          </div>

          <div className="relative max-w-5xl mx-auto" id="shorten-box">
            {/* Dashboard / Shorten UI Mockup */}
            <div className="bg-white rounded-t-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row text-left">
              
              {/* Sidebar Mockup */}
              <div className="hidden md:flex flex-col w-64 border-r border-[#E5E7EB] bg-white p-6">
                <div className="flex items-center gap-2 mb-8 text-[#0F172A]">
                  <Scissors className="h-6 w-6 text-[#0F172A]" />
                  <span className="text-[20px] font-bold tracking-tight">ShortLink</span>
                </div>
                <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-4">Main Menu</div>
                <div className="space-y-1">
                  <div className="bg-[#7041f4] text-white px-4 py-2.5 rounded-lg font-bold shadow-sm shadow-[#7041f4]/20 flex items-center gap-3">
                    <Link2 className="w-4 h-4" /> Dashboard
                  </div>
                  <div className="text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] px-4 py-2.5 rounded-lg font-bold transition-colors flex items-center gap-3 cursor-pointer">
                    <BarChart3 className="w-4 h-4" /> Insight
                  </div>
                  <div className="text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A] px-4 py-2.5 rounded-lg font-bold transition-colors flex items-center gap-3 cursor-pointer">
                    <Zap className="w-4 h-4" /> Links
                  </div>
                </div>
              </div>

              {/* Main Area */}
              <div className="flex-1 bg-white p-6 md:p-10 relative">
                {/* Header Mock */}
                <div className="hidden md:flex justify-between items-center mb-10 pb-6 border-b border-slate-100">
                  <div className="relative w-80">
                    <input type="text" placeholder="Search something here" className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-slate-900 text-sm rounded-full pl-10 pr-4 py-2.5 focus:outline-none" disabled />
                    <svg className="w-4 h-4 text-slate-400 absolute left-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300"></div>
                    <span className="text-sm font-bold text-[#0F172A]">John Comors</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="max-w-2xl">
                  <div className="mb-8">
                    <h2 className="text-[20px] font-extrabold text-[#0F172A] mb-1">Create Short Link</h2>
                    <p className="text-[#64748B] text-[14px] font-medium">Instantly shorten your long URLs for easier sharing.</p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Link2 className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/your-very-long-url-to-shorten"
                        required
                        className="w-full px-4 py-4 pl-12 text-[15px] bg-slate-50 border border-[#CBD5E1] text-[#0F172A] rounded-xl focus:outline-none focus:border-[#7041f4] focus:ring-1 focus:ring-[#7041f4] transition-all shadow-sm"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isLoading || !url.trim()}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#7041f4] hover:bg-[#5b32cc] text-white text-[15px] font-bold py-3.5 px-8 rounded-xl transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <>Shorten now <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>

                  {shortenedUrl && (
                    <div className="mt-8 p-5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex-1 truncate w-full text-left">
                        <p className="text-xs text-[#166534] font-bold uppercase tracking-wider mb-1">Success! Your short link</p>
                        <a href={shortenedUrl} target="_blank" rel="noreferrer" className="text-lg font-bold text-[#15803D] hover:text-[#166534] truncate block">
                          {shortenedUrl}
                        </a>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-[#BBF7D0] text-[#15803D] hover:bg-[#F0FDF4] px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm"
                      >
                        {isCopied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                      </button>
                    </div>
                  )}

                  {/* Sub Features */}
                  <div className="mt-10 pt-8 border-t border-slate-100 flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-2 text-slate-600 font-bold"><CheckCircle2 className="w-4 h-4 text-[#7041f4]" /> Analytics Tracking</span>
                    <span className="flex items-center gap-2 text-slate-600 font-bold"><CheckCircle2 className="w-4 h-4 text-[#7041f4]" /> Custom Alias</span>
                    <span className="flex items-center gap-2 text-slate-600 font-bold"><CheckCircle2 className="w-4 h-4 text-[#7041f4]" /> Secure Redirects</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
};

export default Home;