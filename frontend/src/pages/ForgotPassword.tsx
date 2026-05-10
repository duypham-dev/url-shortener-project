import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Scissors } from 'lucide-react';
import { forgotPasswordApi } from '../api/auth.api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const response = await forgotPasswordApi({ email });
      setStatus('success');
      toast.success(response.message || (response as any).data?.message || 'Reset link sent successfully!');
    } catch (err: any) {
      setStatus('error');
      toast.error(err.response?.data?.message || err.message || 'Something went wrong.');
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      <div className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-24 xl:px-32 overflow-y-auto">
        <Link to="/" className="flex items-center gap-2 mb-12 w-fit hover:opacity-80 transition-opacity">
          <Scissors className="w-8 h-8 text-[#e25822]" />
          <span className="text-2xl font-bold text-[#e25822] tracking-tight">ShortLink</span>
        </Link>
        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center pb-20">
          <h1 className="text-[32px] font-extrabold mb-2 text-slate-900 tracking-tight">Forgot Password</h1>
          <p className="text-slate-600 mb-10 text-[15px]">Enter your email to receive a password reset link.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-800 mb-2">Email</label>
              <input 
                id="email" type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-[#3452cf]/20 focus:border-[#3452cf] outline-none transition-all" 
              />
            </div>
            <div className="pt-2">
              <button 
                type="submit" disabled={status === 'loading'}
                className="w-full bg-[#3452cf] hover:bg-[#2841a8] disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded flex justify-center items-center gap-2"
              >
                {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </button>
            </div>
          </form>
          <div className="mt-8 text-center">
            <Link to="/login" className="text-[#3452cf] hover:underline font-medium text-sm">Back to Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ForgotPassword;