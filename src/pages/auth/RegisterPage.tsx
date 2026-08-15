import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../contexts/LanguageContext";
import { toFriendlyErrorMessage } from "../../lib/errorMessages";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgName.trim() || !fullName.trim() || !email.trim() || !password) {
      setError(
        t(
          "auth.requiredFields",
          "Organization name, full name, email, and password are required.",
        ),
      );
      return;
    }
    if (password.length < 8) {
      setError(
        t("auth.minPassword", "Password must be at least 8 characters."),
      );
      return;
    }

    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/create-organization`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            orgName: orgName.trim(),
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim() || undefined,
            password,
          }),
        },
      );

      const data = await res.json();

      if (!data.ok) {
        setError(toFriendlyErrorMessage(data.error));
        setLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      setLoading(false);

      if (signInErr) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 3000);
      } else {
        navigate("/");
      }
    } catch (err) {
      setLoading(false);
      setError(toFriendlyErrorMessage(err));
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] dark:bg-[#0B1120] flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white dark:bg-[#151E30] p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Organization created!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base">
            Redirecting you to the sign-in page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f7f9fb] dark:bg-[#0B1120] text-[#191c1e] dark:text-slate-100 antialiased font-sans">
      {/* LEFT SIDE: Brand Hero Area with Background Image (10% Bigger) */}
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
          <div className="flex items-center gap-3 mb-20">
            <span className="text-white text-6xl lg:text-7xl font-black tracking-tighter uppercase font-sans">
              Aktera
            </span>
          </div>

          <div className="max-w-lg">
            <h1 className="text-4xl lg:text-[52px] font-extrabold mb-8 leading-[1.15] text-white tracking-tight">
              {t(
                "auth.heroRegisterTitle",
                "Start transforming your brand engagement today.",
              )}
            </h1>
            <p className="text-xl text-blue-200/95 leading-relaxed mb-12 font-normal">
              {t(
                "auth.heroRegisterSubtitle",
                "Launch high-converting gamified promotional campaigns, collect verified customer leads, and scale your brand reach across Algeria.",
              )}
            </p>
          </div>
        </div>

        <div className="relative z-10 text-sm text-blue-200/70 font-medium">
          © {new Date().getFullYear()} Aktera. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: Registration Form Area (10% Bigger) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-14 bg-white dark:bg-[#0e1422] min-h-screen overflow-y-auto">
        <div className="w-full max-w-[480px] space-y-7 py-8">
          {/* Header & Logo */}
          <div className="text-center lg:text-left">
            <div className="w-20 h-20 mx-auto lg:mx-0 mb-6 rounded-2xl bg-white dark:bg-[#151E30] p-2 flex items-center justify-center shadow-md border border-slate-200 dark:border-slate-800">
              <img
                src="/aktera-logo.png"
                alt="Aktera Logo"
                className="w-full h-full object-contain dark:invert"
              />
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2.5">
              {t("auth.registerTitle", "Register Organization")}
            </h2>
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium">
              {t(
                "auth.registerSubtitle",
                "Create an operator account for your enterprise.",
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
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organization Name */}
            <div className="space-y-2">
              <label className="block text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {t("auth.orgName", "Organization Name")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  dir="auto"
                  required
                  placeholder="e.g. Acme Enterprises"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#151E30] text-slate-900 dark:text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all font-medium"
                />
              </div>
            </div>

            {/* Representative Full Name */}
            <div className="space-y-2">
              <label className="block text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {t("auth.fullName", "Your Full Name")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  dir="auto"
                  required
                  placeholder="e.g. Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#151E30] text-slate-900 dark:text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all font-medium"
                />
              </div>
            </div>

            {/* Work Email */}
            <div className="space-y-2">
              <label className="block text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {t("auth.workEmail", "Work Email")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  dir="auto"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#151E30] text-slate-900 dark:text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all font-medium"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="block text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {t("auth.phone", "Phone Number")}{" "}
                <span className="text-slate-400 normal-case font-normal">
                  {t("auth.optional", "(optional)")}
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  dir="auto"
                  placeholder="e.g. 0550000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#151E30] text-slate-900 dark:text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {t("auth.password", "Password")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#151E30] text-slate-900 dark:text-white text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-4 px-5 rounded-2xl shadow-lg shadow-blue-600/25 text-base font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-all cursor-pointer hover:scale-[1.01] mt-3"
            >
              {loading ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {t("auth.creatingAccount", "Creating account...")}
                  </span>
                </div>
              ) : (
                t("auth.createAccount", "Create Enterprise Account")
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="pt-2 text-center">
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium">
              {t("auth.alreadyHaveAccount", "Already have an account?")}{" "}
              <Link
                to="/login"
                className="font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                {t("auth.signInHere", "Sign in here")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
