import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Scissors } from 'lucide-react';
import { registerApi } from '../api/auth.api';
import { useAuthStore } from '../store/useAuthStore';
import type { RegisterInput } from '../types/auth.type';

// ============================================================
// Helpers
// ============================================================
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

type RegisterForm = RegisterInput & { confirmPassword: string };

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const validate = (form: RegisterForm): FieldErrors => {
  const errors: FieldErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (form.fullName.trim().length < 3) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Invalid email format.';
  }

  if (!form.password) {
    errors.password = 'Password is required.';
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(form.password)) {
    errors.password = 'Password must contain at least 1 uppercase letter and 1 number.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
};

// ============================================================
// Component
// ============================================================
const Register: React.FC = () => {
  const navigate = useNavigate();
  const loginStore = useAuthStore((s) => s.login);

  const [form, setForm] = useState<RegisterForm>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Xóa lỗi của field đang nhập
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (serverError) setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setIsLoading(true);
      setServerError(null);

      const response = await registerApi({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      loginStore(response.data.user, response.data.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiError = err as { message?: string; errors?: Record<string, string> };

      if (apiError.errors) {
        // Map server-side field errors vào fieldErrors
        setFieldErrors(apiError.errors as FieldErrors);
      } else {
        setServerError(apiError?.message ?? 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      {/* ---- Left Panel ---- */}
      <div className="flex-1 flex flex-col px-6 py-8 md:px-12 lg:px-24 xl:px-32 overflow-y-auto">
        <Link
          to="/"
          className="flex items-center gap-2 mb-12 w-fit hover:opacity-80 transition-opacity"
        >
          <Scissors className="w-8 h-8 text-[#e25822]" />
          <span className="text-2xl font-bold text-[#e25822] tracking-tight">ShortLink</span>
        </Link>

        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center pb-20">
          <h1 className="text-[32px] font-extrabold mb-2 text-slate-900 tracking-tight">
            Create your account
          </h1>
          <p className="text-slate-600 mb-10 text-[15px]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#3452cf] hover:underline font-medium">
              Log in
            </Link>
          </p>

          {/* Server error banner */}
          {serverError && (
            <div
              role="alert"
              className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm border border-red-200"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-bold text-slate-800 mb-2">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="Fullname"
                value={form.fullName}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white border rounded outline-none transition-all text-[15px] ${
                  fieldErrors.fullName
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-slate-300 focus:ring-2 focus:ring-[#3452cf]/20 focus:border-[#3452cf]'
                }`}
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-800 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white border rounded outline-none transition-all text-[15px] ${
                  fieldErrors.email
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-slate-300 focus:ring-2 focus:ring-[#3452cf]/20 focus:border-[#3452cf]'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-800 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white border rounded outline-none transition-all text-[15px] ${
                  fieldErrors.password
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-slate-300 focus:ring-2 focus:ring-[#3452cf]/20 focus:border-[#3452cf]'
                }`}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-bold text-slate-800 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-white border rounded outline-none transition-all text-[15px] ${
                  fieldErrors.confirmPassword
                    ? 'border-red-400 focus:border-red-400'
                    : 'border-slate-300 focus:ring-2 focus:ring-[#3452cf]/20 focus:border-[#3452cf]'
                }`}
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#3452cf] hover:bg-[#2841a8] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded transition-colors flex justify-center items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign up'}
              </button>
            </div>
          </form>

          <p className="text-[12px] text-slate-500 mt-10 leading-relaxed font-medium">
            By creating an account, you agree to ShortLink's{' '}
            <a href="#" className="underline text-slate-600 hover:text-slate-900">
              Terms of Service
            </a>
            ,{' '}
            <a href="#" className="underline text-slate-600 hover:text-slate-900">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="#" className="underline text-slate-600 hover:text-slate-900">
              Acceptable Use Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* ---- Right Panel ---- */}
      <div className="hidden lg:flex flex-1 bg-[#f4f2ea] flex-col items-center justify-center p-12">
        <div className="max-w-[480px] w-full flex flex-col items-center">
          <img
            src="/ilus.png"
            alt="Connect ShortLink to your tools"
            className="w-full h-auto mb-10 object-contain drop-shadow"
          />
          <h2 className="text-[32px] font-extrabold text-slate-900 text-center leading-tight tracking-tight">
            Connect ShortLink to the tools you use every day
          </h2>
        </div>
      </div>
    </div>
  );
};

export default Register;