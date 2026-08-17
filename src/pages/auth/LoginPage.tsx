import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { toFriendlyErrorMessage } from "../../lib/errorMessages";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError(t("auth.requiredFields", "Email and password are required."));
      return;
    }

    setLoading(true);
    const errMsg = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (errMsg) {
      setError(toFriendlyErrorMessage(errMsg));
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f7f9fb] dark:bg-[#0B1120] text-[#191c1e] dark:text-slate-100 antialiased font-sans">
      {/* LEFT SIDE: Brand Hero Area with Background Image (10% Bigger Writing) */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 lg:p-24 relative text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(30, 58, 138, 0.75)), url("/login-img.png")`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
        }}
      >
        <div className="grid-pattern"></div>
        <div className="relative z-10">
          {/* Top Brand Name */}
          <div className="flex items-center gap-3 mb-20">
            <span className="text-white text-6xl lg:text-7xl font-black tracking-tighter uppercase font-sans">
              Aktera
            </span>
          </div>

          <div className="max-w-lg">
            <h1 className="text-4xl lg:text-[52px] font-extrabold mb-8 leading-[1.15] text-white tracking-tight">
              {t(
                "auth.welcomeTitle",
                "Welcome to the future of enterprise engagement.",
              )}
            </h1>
            <p className="text-xl text-blue-200/95 leading-relaxed mb-12 font-normal">
              {t(
                "auth.welcomeSubtitle",
                "Advanced analytics, seamless workflows, and secure access—all in one unified platform designed for modern teams.",
              )}
            </p>
          </div>
        </div>

        {/* Bottom subtle copyright */}
        <div className="relative z-10 text-sm text-blue-200/70 font-medium">
          © {new Date().getFullYear()} Aktera. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: Login Form Area (10% Bigger Writing & Inputs) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-14 bg-white dark:bg-[#0e1422] min-h-screen">
        <div className="w-full max-w-[460px] space-y-8">
          {/* Header & Logo */}
          <div className="text-center lg:text-left">
            <div className="w-24 h-24 mx-auto lg:mx-0 mb-7 rounded-2xl bg-white dark:bg-[#151E30] p-2.5 flex items-center justify-center shadow-md border border-slate-200 dark:border-slate-800">
              <img
                src="/aktera-logo.png"
                alt="Aktera Logo"
                className="w-full h-full object-contain dark:invert"
              />
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2.5">
              {t("auth.signIn", "Sign In")}
            </h2>
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium">
              {t(
                "auth.signInSubtitle",
                "Enter your credentials to access your account.",
              )}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 rounded-2xl px-4 py-3.5 text-base font-bold shadow-sm">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label
                className="block text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200"
                htmlFor="login-email"
              >
                {t("auth.emailAddress", "Email Address")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  dir="auto"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#151E30] text-slate-900 dark:text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                className="block text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200"
                htmlFor="login-password"
              >
                {t("auth.password", "Password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-12 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#151E30] text-slate-900 dark:text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span className="text-sm sm:text-base font-semibold text-slate-600 dark:text-slate-300">
                  {t("auth.rememberMe", "Remember me")}
                </span>
              </label>
              <a
                href="#"
                className="text-sm sm:text-base font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                {t("auth.forgotPassword", "Forgot password?")}
              </a>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-4 px-5 rounded-2xl shadow-lg shadow-blue-600/25 text-base font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-all cursor-pointer hover:scale-[1.01]"
            >
              {loading ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t("auth.signingIn", "Signing in...")}</span>
                </div>
              ) : (
                t("auth.signIn", "Sign In")
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="px-3 bg-white dark:bg-[#0e1422] text-slate-400 dark:text-slate-400 font-black">
                {t("auth.orSignInWith", "Or sign in with")}
              </span>
            </div>
          </div>

          {/* SSO Buttons */}
          <div className="grid grid-cols-2 gap-3.5">
            <button
              type="button"
              className="w-full inline-flex justify-center items-center py-3.5 px-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-[#151E30] dark:hover:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 mr-2.5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google</span>
            </button>
            <button
              type="button"
              className="w-full inline-flex justify-center items-center py-3.5 px-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-[#151E30] dark:hover:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 mr-2.5" viewBox="0 0 21 21">
                <path d="M10 0H0V10H10V0Z" fill="#F25022" />
                <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
                <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
                <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
              </svg>
              <span>Microsoft</span>
            </button>
          </div>

          {/* Footer Link */}
          <div className="pt-2 text-center">
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium">
              {t("auth.dontHaveAccount", "Don't have an account?")}{" "}
              <Link
                to="/register"
                className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                {t("auth.registerOrg", "Register your organization")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
