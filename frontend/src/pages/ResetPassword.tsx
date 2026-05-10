import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Scissors } from 'lucide-react';
import { resetPasswordApi } from '../api/auth.api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      setStatus('error');
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      toast.error('Password must be at least 8 characters');
      return;
    }

    setStatus('loading');
    try {
      const response = await resetPasswordApi({ token: token || '', newPassword: password });
      setStatus('success');
      toast.success(response.message || (response as any).data?.message || 'Password reset successfully!'); 
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setStatus('error');
      toast.error(err.response?.data?.message || err.message || 'Something went wrong.');
    }
  };

  if (!token) return <div className="p-8 text-center">Invalid reset link. Token missing.</div>;

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      <div className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-24 xl:px-32 overflow-y-auto">
        <Link to="/" className="flex items-center gap-2 mb-12 w-fit hover:opacity-80 transition-opacity">
          <Scissors className="w-8 h-8 text-[#e25822]" />
          <span className="text-2xl font-bold text-[#e25822] tracking-tight">ShortLink</span>
        </Link>
        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center pb-20">
          <h1 className="text-[32px] font-extrabold mb-2 text-slate-900 tracking-tight">Reset Password</h1>
          
          {status === 'success' ? (
            <div className="text-center p-4 pt-6 text-slate-600 font-medium">
              Redirecting to login...
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4 pt-6">
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">New Password</label>
                  <input 
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-[#3452cf]/20 focus:border-[#3452cf] outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">Confirm Password</label>
                  <input 
                    type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-[#3452cf]/20 focus:border-[#3452cf] outline-none transition-all" 
                  />
                </div>
                <div className="pt-2">
                  <button 
                    type="submit" disabled={status === 'loading'}
                    className="w-full bg-[#3452cf] hover:bg-[#2841a8] disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded flex justify-center items-center gap-2"
                  >
                    {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default ResetPassword;