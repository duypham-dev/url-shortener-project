import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { axiosClient } from '../api/axiosClient';
import { Loader2, Scissors } from 'lucide-react';
import ButtonLoginGoogle from '../components/ButtonLoginGoogle';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';
  const setAuth = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      const response: any = await axiosClient.post('/auth/login', { email, password });
      
      if (response.success) {
        setAuth(response.data.user, response.data.accessToken);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      {/* Left Panel */}
      <div className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-24 xl:px-32 relative overflow-y-auto">
        <Link to="/" className="flex items-center gap-2 mb-12 w-fit hover:opacity-80 transition-opacity">
          <Scissors className="w-8 h-8 text-[#e25822]" />
          <span className="text-2xl font-bold text-[#e25822] tracking-tight">ShortLink</span>
        </Link>

        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center pb-20">
          <h1 className="text-[32px] font-extrabold mb-2 text-slate-900 tracking-tight">Log in and start sharing</h1>
          <p className="text-slate-600 mb-10 text-[15px]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#3452cf] hover:underline font-medium">Sign up</Link>
          </p>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded mb-6 text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-[#3452cf]/20 focus:border-[#3452cf] outline-none transition-all text-[15px]"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-[#3452cf]/20 focus:border-[#3452cf] outline-none transition-all text-[15px]"
                required
              />
              <div className="mt-3 text-left">
                <a href="#" className="text-sm text-[#3452cf] hover:underline font-medium">Forgot your password?</a>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#3452cf] hover:bg-[#2841a8] text-white font-bold py-3.5 px-4 rounded transition-colors flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log in'}
              </button>
            </div>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-[11px] font-bold tracking-widest text-slate-500">
              <span className="px-4 bg-white uppercase">OR</span>
            </div>
          </div>
          
          <ButtonLoginGoogle />

          <p className="text-[12px] text-slate-500 mt-10 leading-relaxed font-medium">
            By logging in with an account, you agree to ShortLink's{' '}
            <a href="#" className="underline text-slate-600 hover:text-slate-900">Terms of Service</a>,{' '}
            <a href="#" className="underline text-slate-600 hover:text-slate-900">Privacy Policy</a> and{' '}
            <a href="#" className="underline text-slate-600 hover:text-slate-900">Acceptable Use Policy</a>.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:flex flex-1 bg-[#f4f2ea] flex-col items-center justify-center p-12">
        <div className="max-w-[480px] w-full flex flex-col items-center">
          <img src="/ilus.png" alt="Connect ShortLink" className="w-full h-auto mb-10 object-contain drop-shadow" />
          <h2 className="text-[32px] font-extrabold text-slate-900 text-center leading-tight tracking-tight">
            Connect ShortLink to the tools you use every day
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Login;