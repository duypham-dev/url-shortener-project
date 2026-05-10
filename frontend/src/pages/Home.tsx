import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Link2, ArrowRight, CheckCircle2, Copy, Check, Shield, Zap, BarChart3, Scissors } from "lucide-react";
import { createShortenUrl } from "../api/link.api";

const Home: React.FC = () => {
  const [url, setUrl] = useState<string>("");
  const [shortenedUrl, setShortenedUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setIsCopied(false);

    try {
      const data = await createShortenUrl(url);
      setShortenedUrl(data.shortUrl);
    } catch (error) {
      console.error("Lỗi khi rút gọn link: ", error);
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
      console.error("Lỗi khi copy: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1727] text-white font-sans selection:bg-[#2a5bd7]/30">
      {/* Navbar */}
      <nav className="bg-[#0b1727] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <Scissors className="h-7 w-7 text-white" />
              <span className="text-2xl font-bold tracking-tight text-white">
                ShortLink
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/login" className="text-slate-300 hover:text-white font-bold transition-colors">
                Log in
              </Link>
              <Link to="/register" className="bg-[#2a5bd7] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-[#1f48b1] transition-colors">
                Sign up free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl md:text-[56px] font-extrabold tracking-tight text-white mb-6 leading-tight">
            Build sustainable digital connections
          </h1>
          <p className="mx-auto max-w-3xl text-lg md:text-[19px] text-slate-300 mb-12 leading-relaxed">
            Use our link shortening, QR code generation, and landing page tools to engage with your audience.
            Manage, edit, and track everything efficiently on a single platform.
          </p>

          {/* URL Shortener Box */}
          <div className="mt-6 w-full max-w-[800px] mx-auto">
            <div className="bg-[#1a2638] border border-white/10 rounded-2xl p-2 pb-0 md:p-3 md:pb-0 shadow-2xl relative pt-12 md:pt-14">
              
              {/* Fake Tabs (Top Center) */}
              <div className="flex justify-center gap-1">
                  <button className="flex items-center justify-center gap-2 absolute top-0 text-white px-5 py-3 font-bold">
                    <Link2 className="w-5 h-5 text-[#dd6b20]" />
                    <span>Short Link</span>
                  </button>
              </div>

              {/* Inner White Form Card */}
              <div className="bg-white rounded-xl md:rounded-2xl rounded-tl-none p-6 md:p-10 text-left relative z-0">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Shorten a long link</h2>
                <p className="text-slate-800 text-[15px] font-medium mb-8">No credit card required.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[15px] font-bold text-slate-900 mb-2 font-display">Paste your long link here</label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/my-long-url"
                      required
                      className="w-full px-4 py-3 text-lg bg-white border border-slate-300 text-slate-900 rounded focus:outline-none focus:border-[#2a5bd7] focus:ring-1 focus:ring-[#2a5bd7] transition-all"
                    />
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || !url.trim()}
                      className="inline-flex items-center justify-center gap-2 bg-[#2a5bd7] hover:bg-[#1f48b1] text-white text-[17px] font-bold py-3.5 px-6 rounded transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <>Get your link for free <ArrowRight className="w-5 h-5" /></>
                      )}
                    </button>
                  </div>
                </form>

                {shortenedUrl && (
                  <div className="mt-8 p-5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex-1 truncate w-full text-left">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Your link</p>
                      <a href={shortenedUrl} target="_blank" rel="noreferrer" className="text-lg font-bold text-[#2a5bd7] hover:text-[#1f48b1] truncate block">
                        {shortenedUrl}
                      </a>
                    </div>
                    <button
                      onClick={handleCopy}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 px-6 py-2.5 rounded font-bold transition-all"
                    >
                      {isCopied ? <><Check className="w-4 h-4 text-green-600" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sub Features */}
            <div className="mt-12 flex flex-col items-center justify-center gap-4 text-sm font-medium">
              <span className="text-white text-lg font-bold tracking-tight">Sign up for free. Features include:</span>
              <ul className="flex flex-wrap justify-center gap-4 md:gap-6 text-slate-300 mt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#dd6b20]" /> 5 links/month limit</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#dd6b20]" /> Custom alias (back-half of link)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#dd6b20]" /> Unlimited clicks</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Features Info Section (Clean, flat blocks matching theme tone) */}
        <div className="bg-[#0b1727] py-20 mt-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/10 pt-20">
              <div className="text-left group">
                <div className="w-12 h-12 rounded flex items-center justify-center text-white mb-6 border border-white/20 group-hover:border-white/50 transition-colors">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Lightning fast</h3>
                <p className="text-slate-400 leading-relaxed text-[15px]">Our system handles thousands of requests, ensuring instant redirects with zero latency.</p>
              </div>
              <div className="text-left group">
                <div className="w-12 h-12 rounded flex items-center justify-center text-white mb-6 border border-white/20 group-hover:border-white/50 transition-colors">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Absolute Security</h3>
                <p className="text-slate-400 leading-relaxed text-[15px]">Protect your audience with HTTPS encryption and automatic 24/7 spam filtering algorithms.</p>
              </div>
              <div className="text-left group">
                <div className="w-12 h-12 rounded flex items-center justify-center text-white mb-6 border border-white/20 group-hover:border-white/50 transition-colors">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Analytics & Insights</h3>
                <p className="text-slate-400 leading-relaxed text-[15px]">Track campaign performance and visitor preferences. Get detailed reports with a single click.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;