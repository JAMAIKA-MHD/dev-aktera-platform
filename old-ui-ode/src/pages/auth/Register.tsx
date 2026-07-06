/**
 * Register — Organization sign-up page.
 *
 * Collects organization info (name, contact email, phone) and the
 * owner's account info (full name, email, password). On submit:
 *   1. Creates the auth.users entry via `supabase.auth.signUp`.
 *   2. Inserts a row into `organizations` (using the returned user id
 *      is not needed — the org gets its own generated id).
 *   3. Inserts a `profiles` row linking the new user to the new org
 *      with role 'owner'.
 *   4. Inserts a `billing` row for the free plan.
 *
 * Steps 2–4 run after sign-up. Because RLS requires `auth.uid()` to
 * match the profile's `id`, these inserts must happen while the new
 * session is active. The `organizations` insert is allowed because
 * the org has no owner check on INSERT (any authenticated user can
 * create an org); the `profiles` insert is allowed because the
 * profile's `id` matches `auth.uid()`.
 *
 * If any post-sign-up insert fails, we surface the error but the
 * auth account already exists — the user can sign in and retry the
 * profile creation from a recovery flow (not built in this phase).
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';
import { Trophy, Mail, Lock, User, Building2, Phone, Loader2, AlertCircle } from 'lucide-react';

/** Form field values validated by react-hook-form. */
interface RegisterFormValues {
  orgName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const getFriendlyRegistrationError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lowered = message.toLowerCase();

  if (lowered.includes('organization name is already in use')) {
    return 'This organization name is already in use. Please choose another name.';
  }

  if (lowered.includes('email is already linked to an organization account')) {
    return 'This email is already linked to an organization account.';
  }

  if (lowered.includes('email is already registered')) {
    return 'This email is already registered. Please sign in instead.';
  }

  return toFriendlyErrorMessage(error, {
    fallback: 'Registration failed. Please try again.',
    duplicate: 'An account already exists with this email or organization details.',
  });
};

export default function Register() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>();

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    setSubmitting(true);

    try {
      const { data, error: onboardingError } = await supabase.functions.invoke('create-organization', {
        body: {
          orgName: values.orgName,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          password: values.password,
        },
      });

      if (onboardingError) {
        throw new Error(onboardingError.message ?? 'The onboarding request failed.');
      }

      if (!data?.ok) {
        throw new Error(data?.error ?? 'We could not finish your organization setup.');
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) throw new Error(signInError.message);
      if (!signInData.session) throw new Error('The account was created, but we could not sign you in.');

      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setServerError(getFriendlyRegistrationError(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <Trophy className="h-10 w-10 text-blue-400" />
            <span className="text-3xl font-bold text-white tracking-tight">DZENGAGE</span>
          </div>
          <p className="text-slate-400 text-sm">
            Create your organization in a few seconds
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Register</h1>
          <p className="text-gray-500 text-sm mb-6">
            30-day free trial, no card required
          </p>

          {/* Server error banner */}
          {serverError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Organization name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Organization name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  {...register('orgName', {
                    required: 'Organization name is required',
                    minLength: { value: 2, message: 'At least 2 characters' },
                  })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="My Company"
                />
              </div>
              {errors.orgName && (
                <p className="mt-1.5 text-sm text-red-600">{errors.orgName.message}</p>
              )}
            </div>

            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  {...register('fullName', {
                    required: 'Your name is required',
                    minLength: { value: 2, message: 'At least 2 characters' },
                  })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Ahmed Benali"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1.5 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Work email
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
                      message: 'Enter a valid email address',
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

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone (optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  {...register('phone')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="+213 5XX XX XX XX"
                />
              </div>
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
                  autoComplete="new-password"
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
                  Creating your workspace...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {/* Link to login */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
