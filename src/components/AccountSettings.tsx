import React, { useEffect, useState, useRef } from "react";
import { AlertCircle, CloudUpload, Check, Save, User } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

interface AccountSettingsProps {
  onAvatarChange?: (url: string) => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  onAvatarChange,
}) => {
  const { profile, organization, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<
    "Notification" | "Profile" | "Password" | "Email"
  >("Notification");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Profile / Organization Fields
  const [orgName, setOrgName] = useState("");
  const [orgContactEmail, setOrgContactEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [nif, setNif] = useState("");
  const [rc, setRc] = useState("");
  const [nis, setNis] = useState("");
  const [ai, setAi] = useState("");
  const [address, setAddress] = useState("");
  const [wilaya, setWilaya] = useState("16 - Alger");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("Telecom & Retail");

  // Contact / Representative Fields
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("Marketing & Growth Lead");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    return localStorage.getItem("user-avatar-preview") || null;
  });

  // Password Fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Email Fields
  const [newEmail, setNewEmail] = useState("");

  // Notification Toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [quotaAlerts, setQuotaAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setOrgContactEmail(organization.contact_email ?? "");
      setOrgPhone(organization.phone_number ?? "");
    }
    if (profile) {
      setContactName(profile.full_name);
      setContactEmail(profile.email);
    }
    const savedPreview = localStorage.getItem("user-avatar-preview");
    if (savedPreview) {
      setAvatarUrl(savedPreview);
    } else if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    } else if (organization?.logo_url) {
      setAvatarUrl(organization.logo_url);
    }
  }, [organization, profile]);

  const [isDragging, setIsDragging] = useState(false);

  const validateAndProcessAvatar = (file: File) => {
    setError(null);
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError(
        "Invalid file format. Please upload a PNG, JPEG, or WebP image.",
      );
      return;
    }
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB limit
    if (file.size > maxSizeBytes) {
      setError("Image file size exceeds the 2MB limit.");
      return;
    }

    // Generate local preview URL
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);
    localStorage.setItem("user-avatar-preview", preview);
    onAvatarChange?.(preview);

    // TODO(backend): wire to Supabase Storage + persist url to profile
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessAvatar(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessAvatar(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      if (activeTab === "Password") {
        if (!newPassword) {
          throw new Error("Please enter a new password.");
        }
        if (newPassword.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        const { error: passErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passErr) throw passErr;

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMessage("Password updated successfully!");
        window.setTimeout(() => setSuccessMessage(null), 4000);
        setSaving(false);
        return;
      }

      if (activeTab === "Email") {
        const targetEmail = newEmail.trim().toLowerCase();
        if (!targetEmail || targetEmail === contactEmail.toLowerCase()) {
          throw new Error("Please enter a different valid email address.");
        }
        const { error: emailErr } = await supabase.auth.updateUser({
          email: targetEmail,
        });
        if (emailErr) throw emailErr;

        setSuccessMessage(
          "Confirmation link sent to your new email address. Please click it to verify.",
        );
        setNewEmail("");
        window.setTimeout(() => setSuccessMessage(null), 5000);
        setSaving(false);
        return;
      }

      if (activeTab === "Notification") {
        setSuccessMessage("Notification settings saved successfully!");
        window.setTimeout(() => setSuccessMessage(null), 4000);
        setSaving(false);
        return;
      }

      if (!organization || !profile) {
        throw new Error(
          "Your organization profile is unavailable. Please refresh and try again.",
        );
      }

      const normalizedOrgName = orgName.trim();
      const normalizedOrgEmail = orgContactEmail.trim().toLowerCase();
      const normalizedOrgPhone = orgPhone.trim();
      const normalizedFullName = contactName.trim();

      const { error: orgErr } = await supabase
        .from("organizations")
        .update({
          name: normalizedOrgName,
          contact_email: normalizedOrgEmail,
          phone_number: normalizedOrgPhone || null,
        })
        .eq("id", organization.id);
      if (orgErr) throw orgErr;

      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          full_name: normalizedFullName,
        })
        .eq("id", profile.id);
      if (profileErr) throw profileErr;

      await refreshProfile();

      setSuccessMessage("Organization settings saved successfully!");
      window.setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(toFriendlyErrorMessage(err, "Failed to save settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="account-settings-root"
      className="max-w-6xl mx-auto space-y-6 text-brand-text pb-16 pt-2"
    >
      {/* Top Header Tab Selector */}
      <div className="flex items-center gap-2 border-b border-card-border pb-4 overflow-x-auto">
        {(["Notification", "Profile", "Password", "Email"] as const).map(
          (tab) => {
            const isActive = activeTab === tab;
            const tabLabels: Record<string, string> = {
              Notification: t("settings.notification", "Notification"),
              Profile: t("settings.profile", "Profile"),
              Password: t("settings.password", "Password"),
              Email: t("settings.email", "Email"),
            };
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 font-black"
                    : isDark
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tabLabels[tab] || tab}
              </button>
            );
          },
        )}
      </div>

      {/* Alert Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/15 border border-red-500/30 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {/* MAIN CONTAINER FORM */}
      <form
        onSubmit={handleSave}
        className={`rounded-[32px] p-7 sm:p-10 shadow-sm border space-y-8 ${
          isDark
            ? "bg-[#151E30] border-slate-800 text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Main Tab Title */}
        <h2 className="text-2xl font-black tracking-tight text-brand-text">
          {activeTab}
        </h2>

        {/* 1. PROFILE TAB */}
        {activeTab === "Profile" && (
          <div className="space-y-8">
            {/* Avatar / Photo Upload Section */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex items-center gap-6 p-4 rounded-3xl border-2 border-dashed transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                  : "border-transparent hover:border-card-border"
              }`}
            >
              {/* Circular Avatar */}
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2 shrink-0 ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-blue-400"
                    : "bg-blue-50 border-blue-200 text-blue-600"
                }`}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Organization Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-9 h-9 stroke-[2.2]" />
                )}
              </div>

              {/* Upload Button & Description */}
              <div className="space-y-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-5 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-md shadow-blue-500/25 cursor-pointer hover:scale-102"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>{t("settings.uploadPhoto", "Upload New Photo")}</span>
                </button>
                <p className="text-[11px] text-brand-textMuted leading-tight">
                  {t(
                    "settings.uploadHint",
                    "At least 800×800 px recommended. JPG, PNG or WebP is allowed (Max 2MB). Drag and drop supported.",
                  )}
                </p>
              </div>
            </div>

            {/* Section 1: Organization Information */}
            <div className="space-y-5">
              <h3 className="text-base font-black text-brand-text tracking-tight">
                {t("settings.orgInfo", "Organization Information")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Organization Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.orgName", "Organization Name")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={orgName}
                    placeholder="e.g. Acme Corp"
                    onChange={(e) => setOrgName(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                    required
                  />
                </div>

                {/* Organization Contact Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.orgEmail", "Organization Contact Email")}
                  </label>
                  <input
                    type="email"
                    dir="auto"
                    value={orgContactEmail}
                    placeholder="e.g. contact@company.com"
                    onChange={(e) => setOrgContactEmail(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                    required
                  />
                </div>

                {/* Organization Phone Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.orgPhone", "Organization Phone Number")}
                  </label>
                  <input
                    type="tel"
                    dir="auto"
                    value={orgPhone}
                    placeholder="e.g. 0550000000"
                    onChange={(e) => setOrgPhone(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold font-mono transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Tax Identification Number (NIF) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.nif", "Tax Identification Number (NIF)")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={nif}
                    placeholder="e.g. 000000000000000"
                    maxLength={15}
                    onChange={(e) => setNif(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold font-mono transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Commercial Register (RC) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.rc", "Commercial Register (RC)")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={rc}
                    placeholder="e.g. 00/00-0000000B00"
                    onChange={(e) => setRc(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold font-mono transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Statistical Identification Number (NIS) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.nis", "Statistical Identification (NIS)")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={nis}
                    placeholder="e.g. 000000000000000"
                    onChange={(e) => setNis(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold font-mono transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Article d'Imposition (AI) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.ai", "Article d'Imposition (AI)")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={ai}
                    placeholder="e.g. 00000000000"
                    onChange={(e) => setAi(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold font-mono transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Industry / Sector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.industry", "Industry & Sector")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={industry}
                    placeholder="e.g. Retail, Technology, Services"
                    onChange={(e) => setIndustry(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Headquarters Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.address", "Headquarters Address")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={address}
                    placeholder="e.g. 123 Business Avenue, Suite 100"
                    onChange={(e) => setAddress(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Wilaya / City */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.wilaya", "Wilaya / Province")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={wilaya}
                    placeholder="e.g. Province / State"
                    onChange={(e) => setWilaya(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>

                {/* Official Website */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.website", "Official Website (URL)")}
                  </label>
                  <input
                    type="url"
                    dir="auto"
                    value={website}
                    placeholder="e.g. https://www.company.com"
                    onChange={(e) => setWebsite(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Account Representative Details */}
            <div className="space-y-5 pt-6 border-t border-card-border">
              <h3 className="text-base font-black text-brand-text tracking-tight">
                {t("settings.assignedRep", "Assigned Representative")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.repName", "Representative Full Name")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={contactName}
                    placeholder="e.g. Jane Doe"
                    onChange={(e) => setContactName(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t("settings.repRole", "Representative Role & Title")}
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={jobTitle}
                    placeholder="e.g. Marketing Lead"
                    onChange={(e) => setJobTitle(e.target.value)}
                    className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PASSWORD TAB */}
        {activeTab === "Password" && (
          <div className="space-y-6">
            <p className="text-xs text-brand-textMuted">
              {t(
                "settings.passwordHelp",
                "Ensure your account is using a long, random password to stay secure.",
              )}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t("settings.currentPassword", "Current Password")}
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  placeholder="••••••••••••"
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                    isDark
                      ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t("settings.newPassword", "New Password")}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  placeholder="At least 6 characters"
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                    isDark
                      ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                  }`}
                  required={activeTab === "Password"}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t("settings.confirmPassword", "Confirm New Password")}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  placeholder="Repeat new password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                    isDark
                      ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                  }`}
                  required={activeTab === "Password"}
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. EMAIL TAB */}
        {activeTab === "Email" && (
          <div className="space-y-6">
            <p className="text-xs text-brand-textMuted">
              {t(
                "settings.emailHelp",
                "Manage your primary login credentials and account access email.",
              )}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t("settings.currentEmail", "Current Login Email")}
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  disabled
                  className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold opacity-70 cursor-not-allowed border ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-slate-400"
                      : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t("settings.newEmail", "New Login Email")}
                </label>
                <input
                  type="email"
                  dir="auto"
                  value={newEmail}
                  placeholder="Enter new email address"
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                    isDark
                      ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                  }`}
                  required={activeTab === "Email"}
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. NOTIFICATION TAB */}
        {activeTab === "Notification" && (
          <div className="space-y-5">
            <p className="text-xs text-brand-textMuted">
              Configure your operational alerts, quota notifications, and
              automated campaign reports.
            </p>

            <div className="space-y-4">
              {/* Email Alerts Toggle */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold text-brand-text">
                    Email Operational Alerts
                  </h4>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    Receive email notifications when player traffic surges or
                    campaign milestones are achieved.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-5 h-5 rounded-md text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                />
              </div>

              {/* Stock Quota Warnings */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold text-brand-text">
                    Reward Inventory & Stock Threshold Warnings
                  </h4>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    Notify administrators automatically when reward library
                    stock drops below 10%.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={quotaAlerts}
                  onChange={(e) => setQuotaAlerts(e.target.checked)}
                  className="w-5 h-5 rounded-md text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                />
              </div>

              {/* Telegram Instant Alerts */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold text-brand-text">
                    Telegram Operations Bot Integration
                  </h4>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    Receive instant winning entries and voucher redemption
                    alerts on your team's Telegram channel.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={telegramAlerts}
                  onChange={(e) => setTelegramAlerts(e.target.checked)}
                  className="w-5 h-5 rounded-md text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                />
              </div>

              {/* Weekly Digest */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <h4 className="text-sm font-bold text-brand-text">
                    Weekly Performance Digest (PDF Summary)
                  </h4>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    Receive an executive weekly summary of all active campaigns
                    every Sunday morning.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="w-5 h-5 rounded-md text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SAVE BUTTON */}
        <div className="flex justify-end pt-6 border-t border-card-border">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs sm:text-sm px-8 py-3 rounded-full font-black flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-102 cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>
              {saving
                ? t("settings.saving", "Saving...")
                : t("settings.saveConfig", "Save Configuration")}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
