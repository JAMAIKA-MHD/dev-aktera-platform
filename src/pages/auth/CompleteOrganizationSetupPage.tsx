import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Flame,
  LogOut,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toFriendlyErrorMessage } from "../../lib/errorMessages";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function CompleteOrganizationSetupPage() {
  const { user, refreshProfile, signOut } = useAuth();
  const { t } = useLanguage();
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState(
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "",
  );
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const email = useMemo(() => user?.email ?? "", [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orgName.trim() || !fullName.trim()) {
      setError(
        t(
          "auth.requiredFields",
          "Organization name and full name are required.",
        ),
      );
      return;
    }

    setLoading(true);

    const { error: rpcError } = await supabase.rpc(
      "complete_current_user_onboarding",
      {
        p_org_name: orgName.trim(),
        p_full_name: fullName.trim(),
        p_phone: phone.trim() || null,
        p_plan: "free",
      },
    );

    if (rpcError) {
      setLoading(false);
      setError(
        toFriendlyErrorMessage(
          rpcError.message,
          "We could not complete organization setup. Please try again.",
        ),
      );
      return;
    }

    await refreshProfile();
    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md mb-3">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t("auth.setupTitle", "Complete organization setup")}
          </h1>
          <p className="text-slate-500 text-sm mt-1 text-center">
            {t(
              "auth.setupSubtitle",
              "Your sign-in worked, but this account does not currently have an organization profile.",
            )}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {t(
                  "auth.setupCompleted",
                  "Organization setup completed. Loading your dashboard...",
                )}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                {t("auth.orgName", "Organization Name")}
              </label>
              <div className="relative flex items-center">
                <Building2 className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  dir="auto"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Enterprises"
                  className="w-full border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all min-h-12"
                  disabled={loading || success}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                {t("auth.fullName", "Your Full Name")}
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  dir="auto"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all min-h-12"
                  disabled={loading || success}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                {t("auth.workEmail", "Email")}
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  dir="auto"
                  value={email}
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-500 bg-slate-50 outline-none min-h-12"
                  disabled
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                {t("auth.phone", "Phone")}{" "}
                <span className="text-slate-400 normal-case font-normal">
                  {t("auth.optional", "(optional)")}
                </span>
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  dir="auto"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0550000000"
                  className="w-full border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all min-h-12"
                  disabled={loading || success}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm transition-all min-h-12 cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-1"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t("auth.saving", "Saving organization...")}</span>
                </>
              ) : (
                t("auth.completeSetup", "Continue to Dashboard")
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={signOut}
            className="w-full mt-4 border border-slate-200 hover:border-slate-300 text-slate-600 font-semibold rounded-xl py-3 text-sm transition-all min-h-12 cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>{t("nav.signOut", "Sign out")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
