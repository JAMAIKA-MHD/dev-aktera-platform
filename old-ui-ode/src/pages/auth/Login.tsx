/**
 * Login — Email/password sign-in page.
 *
 * Uses react-hook-form for validation and the AuthContext's `signIn`
 * method. On success, redirects to the dashboard (or the page the
 * user was originally trying to reach, stored in location.state.from).
 * On failure, shows the error message inline.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

/** Form field values validated by react-hook-form. */
interface LoginFormValues {
  email: string;
  password: string;
}

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // react-hook-form setup with basic validation rules.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>();

  /**
   * Submit handler: calls AuthContext.signIn. On success, redirects
   * to the dashboard or the originally requested page.
   */
  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setSubmitting(true);

    const errorMsg = await signIn(values.email, values.password);

    if (errorMsg) {
      setServerError(errorMsg);
      setSubmitting(false);
    } else {
      // Redirect to the page the user was trying to reach, or the dashboard.
      const from = (location.state as { from?: string })?.from ?? '/dashboard';
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Trophy className="h-10 w-10 text-blue-400" />
            <span className="text-3xl font-bold text-white tracking-tight">DZENGAGE</span>
          </div>
          <p className="text-slate-400 text-sm">
            B2B gamification platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
          <p className="text-gray-500 text-sm mb-6">
            Sign in to your organization workspace
          </p>

          {/* Server error banner */}
          {serverError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  autoComplete="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Invalid email',
                    },
                  })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="you@company.dz"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'At least 6 characters',
                    },
                  })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Link to register */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account yet?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Create an organization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
