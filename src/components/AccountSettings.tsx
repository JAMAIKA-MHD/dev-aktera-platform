import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Mail,
  Monitor,
  Plus,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { useLanguage } from "../contexts/LanguageContext";
import { ALGERIA_WILAYAS } from "../lib/algeriaWilayas";
import {
  Badge,
  Chip,
  CompactCard,
  Divider,
  Field,
  FormActions,
  IconTile,
  Note,
  PasswordInput,
  SelectInput,
  SettingsCard,
  Skeleton,
  Switch,
  TextInput,
  describedBy,
} from "./settings/SettingsUi";
import { TeamTab } from "./settings/TeamTab";
import { IntegrationsTab } from "./settings/IntegrationsTab";
import { BillingTab } from "./settings/BillingTab";
import {
  MIN_PASSWORD_LENGTH,
  STRENGTH_LABELS,
  passwordLevel,
  passwordRules,
} from "./settings/passwordStrength";
import "./settings/organizationSettings.css";

interface AccountSettingsProps {
  onAvatarChange?: (url: string) => void;
}

const TABS = [
  "Organization",
  "Team",
  "Notifications",
  "Security",
  "Email",
  "Integrations",
  "Billing",
] as const;
type Tab = (typeof TABS)[number];

const INDUSTRIES = [
  "Telecom & Retail",
  "Retail & E-commerce",
  "Food & Beverage",
  "Banking & Insurance",
  "Automotive",
  "Health & Beauty",
  "Technology",
  "Media & Entertainment",
  "Services",
  "Other",
] as const;

// The value stays the one the page always kept ("16 - Alger"); only its label reads "16 · Alger".
const WILAYA_OPTIONS = ALGERIA_WILAYAS.map((wilaya) => {
  const code = String(wilaya.code).padStart(2, "0");
  return {
    value: `${code} - ${wilaya.name}`,
    label: `${code} · ${wilaya.name}`,
  };
});

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
] as const;
const TIME_ZONES = [
  { value: "Africa/Algiers", label: "Africa/Algiers (GMT+1)" },
  { value: "Europe/Paris", label: "Europe/Paris (GMT+1/+2)" },
  { value: "UTC", label: "UTC (GMT+0)" },
] as const;
const CURRENCIES = [
  { value: "DZD", label: "DZD · Algerian dinar" },
  { value: "EUR", label: "EUR · Euro" },
  { value: "USD", label: "USD · US dollar" },
] as const;
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
].map((day) => ({ value: day, label: day }));
const DIGEST_FREQUENCIES = [
  { value: "week", label: "Every week" },
  { value: "month", label: "Every month" },
];
// Up to the 28th: the one range every month has.
const MONTH_DAYS = Array.from({ length: 28 }, (_, index) => {
  const day = index + 1;
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return { value: String(day), label: `${day}${suffix} of the month` };
});
const TIMES = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "12:00",
  "18:00",
].map((time) => ({ value: time, label: `${time} · Algiers time` }));

// The alerts of the Notifications tab, by group, and the channels each goes to.
const CHANNELS = ["email", "inApp"] as const;
type Channel = (typeof CHANNELS)[number];
const CHANNEL_LABELS: Record<Channel, string> = {
  email: "Email",
  inApp: "In-app",
};
const ALERT_GROUPS = [
  {
    caption: "Campaigns",
    alerts: [
      {
        id: "surge",
        title: "Player traffic surge",
        description: "A sudden rise in players on one of your campaigns.",
      },
      {
        id: "milestone",
        title: "Campaign milestone reached",
        description: "A campaign reaches a player or prize milestone.",
      },
    ],
  },
  {
    caption: "Rewards",
    alerts: [{ id: "stock", title: "Low reward stock", description: null }],
  },
  {
    caption: "Winners and redemptions",
    alerts: [
      {
        id: "winner",
        title: "New winning entry",
        description: "A player wins a prize.",
      },
      {
        id: "redeemed",
        title: "Code redeemed",
        description: "A winner's code is redeemed at a store.",
      },
    ],
  },
] as const;
type AlertId = (typeof ALERT_GROUPS)[number]["alerts"][number]["id"];
type AlertMatrix = Record<AlertId, Record<Channel, boolean>>;

// Checks of the organization form, run once a field has been left (never while it is first
// typed), then as it changes. They only tell; the save itself is unchanged.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (value: string) => value.replace(/\s/g, "");
function checkField(key: string, raw: string): string | null {
  const value = raw.trim();
  switch (key) {
    case "orgName":
      return value ? null : "Enter the organization's name.";
    case "orgContactEmail":
      return EMAIL.test(value)
        ? null
        : "Enter a valid email, like contact@company.dz.";
    case "website":
      return !value || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(value)
        ? null
        : "Enter a full address starting with https://";
    case "orgPhone":
      return !value || /^0?\d{9}$/.test(digits(value))
        ? null
        : "Enter 9 digits after +213 (a leading 0 is fine).";
    case "nif":
    case "nis":
      return !value || /^\d{15}$/.test(digits(value))
        ? null
        : "This number has 15 digits.";
    case "ai":
      return !value || /^\d{11}$/.test(digits(value))
        ? null
        : "This number has 11 digits.";
    case "rc":
      return !value || /^\d{2}\/\d{2}-\d{7}[A-Z]\d{2}$/i.test(value)
        ? null
        : "Use the format 00/00-0000000B00.";
    case "postalCode":
      return !value || /^\d{5}$/.test(value)
        ? null
        : "A postal code has 5 digits.";
    default:
      return null;
  }
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

// The labels of the fields still empty.
function emptyOf(fields: Record<string, string>): string[] {
  return Object.keys(fields).filter((label) => !fields[label].trim());
}

// This device, as the browser describes itself: the one session the page can name.
function thisDevice(): { name: string; mobile: boolean } {
  const agent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Chrome\//.test(agent)
      ? "Chrome"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser";
  const system = /Windows/.test(agent)
    ? "Windows"
    : /Android/.test(agent)
      ? "Android"
      : /iPhone|iPad/.test(agent)
        ? "iOS"
        : /Mac OS/.test(agent)
          ? "macOS"
          : /Linux/.test(agent)
            ? "Linux"
            : "";
  return {
    name: system ? `${browser} on ${system}` : browser,
    mobile: /Android|iPhone|iPad|Mobile/.test(agent),
  };
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  onAvatarChange,
}) => {
  const { profile, organization, refreshProfile } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<Tab>("Organization");

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
  const [commune, setCommune] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("Telecom & Retail");

  // Regional preferences (kept on this page, like the fiscal identifiers)
  const [language, setLanguage] = useState("fr");
  const [timeZone, setTimeZone] = useState("Africa/Algiers");
  const [currency, setCurrency] = useState("DZD");

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
  const [emailPassword, setEmailPassword] = useState(""); // asked, not sent (no backend)

  // Notification settings (kept on this page: saving them only confirms, as before). The
  // former switches live on in the grid (operational alerts by email, stock warnings) and in
  // the scheduled digest.
  const [alerts, setAlerts] = useState<AlertMatrix>({
    surge: { email: true, inApp: true },
    milestone: { email: true, inApp: true },
    stock: { email: true, inApp: true },
    winner: { email: false, inApp: true },
    redeemed: { email: false, inApp: true },
  });
  const [stockThreshold, setStockThreshold] = useState("10");
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("week");
  const [digestDay, setDigestDay] = useState("Sunday");
  const [digestMonthDay, setDigestMonthDay] = useState("1");
  const [digestTime, setDigestTime] = useState("08:00");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientDraft, setRecipientDraft] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // The save buttons sit at the bottom of long forms and the messages at the top: bring a new
  // message into view.
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedbackRef.current?.scrollIntoView({ block: "nearest" });
  }, [error, successMessage]);

  // What the long forms hold now, and what they held when last loaded or saved: the buttons
  // compare the two, and Discard brings the saved values back.
  const orgValues = {
    orgName,
    orgContactEmail,
    orgPhone,
    nif,
    rc,
    nis,
    ai,
    address,
    wilaya,
    commune,
    postalCode,
    website,
    industry,
    language,
    timeZone,
    currency,
    contactName,
    jobTitle,
  };
  type OrgValues = typeof orgValues;
  const orgSetters: { [K in keyof OrgValues]: (value: string) => void } = {
    orgName: setOrgName,
    orgContactEmail: setOrgContactEmail,
    orgPhone: setOrgPhone,
    nif: setNif,
    rc: setRc,
    nis: setNis,
    ai: setAi,
    address: setAddress,
    wilaya: setWilaya,
    commune: setCommune,
    postalCode: setPostalCode,
    website: setWebsite,
    industry: setIndustry,
    language: setLanguage,
    timeZone: setTimeZone,
    currency: setCurrency,
    contactName: setContactName,
    jobTitle: setJobTitle,
  };
  const notificationValues = {
    alerts,
    stockThreshold,
    digestEnabled,
    digestFrequency,
    digestDay,
    digestMonthDay,
    digestTime,
    recipients,
  };
  const [orgSaved, setOrgSaved] = useState<OrgValues>(orgValues);
  const [notificationsSaved, setNotificationsSaved] =
    useState(notificationValues);

  useEffect(() => {
    const loaded: Partial<OrgValues> = {};
    if (organization) {
      setOrgName(organization.name);
      setOrgContactEmail(organization.contact_email ?? "");
      setOrgPhone(organization.phone_number ?? "");
      loaded.orgName = organization.name;
      loaded.orgContactEmail = organization.contact_email ?? "";
      loaded.orgPhone = organization.phone_number ?? "";
    }
    if (profile) {
      setContactName(profile.full_name);
      setContactEmail(profile.email);
      loaded.contactName = profile.full_name;
    }
    setOrgSaved((saved) => ({ ...saved, ...loaded }));
    // The digest goes to the signed-in person until someone else is added.
    if (profile?.email) {
      setRecipients((now) => (now.length ? now : [profile.email]));
      setNotificationsSaved((saved) =>
        saved.recipients.length
          ? saved
          : { ...saved, recipients: [profile.email] },
      );
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

  const orgDirty = (Object.keys(orgValues) as (keyof OrgValues)[]).some(
    (key) => orgValues[key] !== orgSaved[key],
  );
  const notificationsDirty =
    JSON.stringify(notificationValues) !== JSON.stringify(notificationsSaved);

  const discardOrg = () => {
    for (const key of Object.keys(orgSetters) as (keyof OrgValues)[]) {
      orgSetters[key](orgSaved[key]);
    }
    setLeft(new Set());
  };
  const discardNotifications = () => {
    setAlerts(notificationsSaved.alerts);
    setStockThreshold(notificationsSaved.stockThreshold);
    setDigestEnabled(notificationsSaved.digestEnabled);
    setDigestFrequency(notificationsSaved.digestFrequency);
    setDigestDay(notificationsSaved.digestDay);
    setDigestMonthDay(notificationsSaved.digestMonthDay);
    setDigestTime(notificationsSaved.digestTime);
    setRecipients(notificationsSaved.recipients);
    setRecipientDraft(null);
  };

  // Fields left at least once: only those show their error.
  const [left, setLeft] = useState<ReadonlySet<string>>(new Set());
  const leave = (key: string) =>
    setLeft((keys) => (keys.has(key) ? keys : new Set(keys).add(key)));
  const errorOf = (key: keyof OrgValues) =>
    left.has(key) ? checkField(key, orgValues[key]) : null;

  // How complete the profile is: 13 fields a brand is expected to fill, by section of the
  // form. The page title carries the tag; each section with an empty field, a small sign.
  const missing = {
    identity: emptyOf({ "organization name": orgName, industry, website }),
    contact: emptyOf({ email: orgContactEmail, phone: orgPhone }),
    legal: emptyOf({ NIF: nif, NIS: nis, RC: rc, AI: ai }),
    headquarters: emptyOf({ address, wilaya, commune }),
    representative: emptyOf({ "full name": contactName }),
  };
  const profileComplete = Object.values(missing).every(
    (fields) => fields.length === 0,
  );
  const missingSign = (part: keyof typeof missing) => {
    if (missing[part].length === 0) return null;
    const label = `Still missing: ${missing[part].join(", ")}`;
    return (
      <span
        className="os-part-missing"
        role="img"
        title={label}
        aria-label={label}
      >
        <AlertCircle aria-hidden strokeWidth={2} />
      </span>
    );
  };

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

  // Clears the local preview only, like the upload sets it (no backend storage yet).
  const removeAvatar = () => {
    setAvatarUrl(null);
    localStorage.removeItem("user-avatar-preview");
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessAvatar(file);
    }
    e.target.value = "";
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
      if (activeTab === "Security") {
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

      if (activeTab === "Notifications") {
        setNotificationsSaved(notificationValues);
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

      setOrgSaved(orgValues);
      setSuccessMessage("Organization settings saved successfully!");
      window.setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(toFriendlyErrorMessage(err, "Failed to save settings."));
    } finally {
      setSaving(false);
    }
  };

  const goTo = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
    setSuccessMessage(null);
  };

  const tabLabels: Record<Tab, string> = {
    Organization: t("settings.organization", "Organization"),
    Team: t("settings.team", "Team"),
    Notifications: t("settings.notification", "Notifications"),
    Security: t("settings.security", "Security"),
    Email: t("settings.email", "Email"),
    Integrations: t("settings.integrations", "Integrations"),
    Billing: t("settings.billing", "Billing"),
  };
  const sections: Record<Tab, { title: string; description: string }> = {
    Organization: {
      title: "Organization profile",
      description:
        "Your company details, legal identifiers and the person responsible for this account.",
    },
    Team: {
      title: "Team & roles",
      description: "Invite colleagues and decide what each person can do.",
    },
    Notifications: {
      title: "Notifications",
      description:
        "Choose what you are alerted about, and where those alerts go.",
    },
    Security: {
      title: "Password & security",
      description:
        "Keep your account protected and review where you are signed in.",
    },
    Email: {
      title: "Email address",
      description:
        "The address you use to sign in and receive account messages.",
    },
    Integrations: {
      title: "Integrations & API",
      description:
        "Connect other tools and let your own systems talk to the platform.",
    },
    Billing: {
      title: "Billing & plan",
      description: "Your subscription, usage and invoices.",
    },
  };
  const optional = t("settings.optional", "optional");
  const soon = t("settings.soon", "Coming soon");
  const formLabels = {
    discard: t("settings.discard", "Discard"),
    save: t("settings.saveChanges", "Save changes"),
    saving: t("settings.saving", "Saving..."),
  };
  const passwordToggle = {
    showLabel: t("settings.showPassword", "Show password"),
    hideLabel: t("settings.hidePassword", "Hide password"),
  };

  // One field of the organization form: its label, control, and check on blur.
  const orgText = (
    key: keyof OrgValues,
    label: string,
    {
      type = "text",
      placeholder,
      help,
      mono = false,
      full = false,
      isOptional = false,
      required = false,
      inputMode,
      maxLength,
    }: {
      type?: string;
      placeholder?: string;
      help?: string;
      mono?: boolean;
      full?: boolean;
      isOptional?: boolean;
      required?: boolean;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
      maxLength?: number;
    } = {},
  ) => {
    const id = `org-${key}`;
    const fieldError = errorOf(key);
    return (
      <Field
        id={id}
        label={label}
        optional={isOptional}
        optionalLabel={optional}
        help={help}
        error={fieldError}
        full={full}
      >
        <TextInput
          id={id}
          type={type}
          dir={mono ? "ltr" : "auto"}
          value={orgValues[key]}
          placeholder={placeholder}
          mono={mono}
          inputMode={inputMode}
          maxLength={maxLength}
          required={required}
          invalid={Boolean(fieldError)}
          aria-describedby={describedBy(id, { help, error: fieldError })}
          onChange={(event) => orgSetters[key](event.target.value)}
          onBlur={() => leave(key)}
        />
      </Field>
    );
  };

  const section = sections[activeTab];
  const loadingProfile = !organization && !profile;
  const sectionTag =
    activeTab === "Integrations" ? (
      <Badge tone="brand">{soon}</Badge>
    ) : activeTab !== "Organization" ||
      loadingProfile ? null : profileComplete ? (
      <Badge tone="ok">
        <Check aria-hidden strokeWidth={2.5} />
        Profile complete
      </Badge>
    ) : (
      <Badge tone="warn">Profile incomplete</Badge>
    );

  // The Security tab: how strong the new password looks (described live), and whether the
  // save's own rule is met (at least MIN_PASSWORD_LENGTH characters, both fields equal).
  const rules = passwordRules(newPassword);
  const level = passwordLevel(newPassword);
  const mismatch = confirmPassword !== "" && confirmPassword !== newPassword;
  const passwordReady =
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword === confirmPassword;
  const device = thisDevice();

  return (
    <div id="account-settings-root" className="os-root">
      <h1 className="os-title">
        {t("settings.pageTitle", "Organization settings")}
      </h1>
      <p className="os-subtitle">
        Manage your organization, your team, your account and how you are
        alerted.
      </p>

      <nav
        className="os-tabs"
        aria-label={t("settings.sections", "Settings sections")}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className="os-tab"
            aria-current={activeTab === tab ? "page" : undefined}
            onClick={() => goTo(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </nav>

      <div className="os-section">
        <div className="os-title-row">
          <h2 className="os-section-title">{section.title}</h2>
          {sectionTag}
        </div>
        <p className="os-section-desc">{section.description}</p>

        <form onSubmit={handleSave} noValidate={activeTab !== "Organization"}>
          <div className="os-stack">
            {(error || successMessage) && (
              <div
                ref={feedbackRef}
                className="os-stack"
                style={{ marginTop: 0 }}
              >
                {error && (
                  <Note tone="danger" icon={<AlertCircle aria-hidden />} live>
                    {error}
                  </Note>
                )}
                {successMessage && (
                  <Note tone="ok" icon={<Check aria-hidden />} live>
                    {successMessage}
                  </Note>
                )}
              </div>
            )}

            {activeTab === "Organization" && loadingProfile && (
              <>
                <Skeleton height={96} />
                <Skeleton height={320} />
                <Skeleton height={200} />
              </>
            )}

            {activeTab === "Organization" && !loadingProfile && (
              <>
                <div className="os-card-group">
                  <SettingsCard
                    labelledBy="card-identity"
                    title={<>Identity{missingSign("identity")}</>}
                    description="How your organization appears across the platform."
                  >
                    <div
                      className="os-logo"
                      data-dragging={isDragging ? "" : undefined}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="os-logo-tile" aria-hidden>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="" />
                        ) : (
                          initials(orgName)
                        )}
                      </div>
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleAvatarSelect}
                          className="hidden"
                          aria-hidden
                          tabIndex={-1}
                        />
                        <div className="os-logo-actions">
                          <button
                            type="button"
                            className="os-btn os-btn-secondary os-btn-sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload aria-hidden strokeWidth={2} />
                            Upload logo
                          </button>
                          <button
                            type="button"
                            className="os-btn os-btn-danger os-btn-sm"
                            onClick={removeAvatar}
                            disabled={!avatarUrl}
                          >
                            <Trash2 aria-hidden strokeWidth={2} />
                            Remove
                          </button>
                        </div>
                        <p className="os-help">
                          JPG or PNG, at least 800 × 800 px. Initials are shown
                          until you upload a logo.
                        </p>
                      </div>
                    </div>
                    <div className="os-grid" style={{ marginTop: 24 }}>
                      {orgText(
                        "orgName",
                        t("settings.orgName", "Organization name"),
                        { placeholder: "Acme Corp", required: true },
                      )}
                      <Field id="org-industry" label="Industry & sector">
                        <SelectInput
                          id="org-industry"
                          value={industry}
                          onChange={setIndustry}
                          options={[
                            ...(INDUSTRIES.includes(
                              industry as (typeof INDUSTRIES)[number],
                            )
                              ? []
                              : [{ value: industry, label: industry }]),
                            ...INDUSTRIES.map((value) => ({
                              value,
                              label: value,
                            })),
                          ]}
                        />
                      </Field>
                      {orgText("website", "Official website", {
                        type: "url",
                        placeholder: "https://www.company.com",
                        isOptional: true,
                        full: true,
                      })}
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    labelledBy="card-contact"
                    title={<>Organization contact{missingSign("contact")}</>}
                    description="A shared address and number for your company, not a personal one."
                  >
                    <div className="os-grid">
                      {orgText(
                        "orgContactEmail",
                        t("settings.orgEmail", "Contact email"),
                        {
                          type: "email",
                          placeholder: "contact@company.com",
                          required: true,
                        },
                      )}
                      <Field
                        id="org-orgPhone"
                        label="Phone number"
                        error={errorOf("orgPhone")}
                      >
                        <div className="os-phone">
                          <span className="os-prefix" aria-hidden>
                            DZ <span className="os-mono">+213</span>
                          </span>
                          <TextInput
                            id="org-orgPhone"
                            type="tel"
                            dir="ltr"
                            mono
                            inputMode="tel"
                            value={orgPhone}
                            placeholder="550 00 00 00"
                            invalid={Boolean(errorOf("orgPhone"))}
                            aria-describedby={describedBy("org-orgPhone", {
                              error: errorOf("orgPhone"),
                            })}
                            onChange={(event) =>
                              setOrgPhone(event.target.value)
                            }
                            onBlur={() => leave("orgPhone")}
                          />
                        </div>
                      </Field>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    labelledBy="card-legal"
                    title={
                      <>Legal & fiscal identifiers{missingSign("legal")}</>
                    }
                    description="Your official registration numbers in Algeria. Format hints appear under each field."
                  >
                    <div className="os-grid os-grid-2">
                      {orgText(
                        "nif",
                        t("settings.nif", "Tax identification number (NIF)"),
                        {
                          mono: true,
                          placeholder: "000000000000000",
                          help: "15 digits",
                          inputMode: "numeric",
                          maxLength: 15,
                        },
                      )}
                      {orgText(
                        "nis",
                        t(
                          "settings.nis",
                          "Statistical identification number (NIS)",
                        ),
                        {
                          mono: true,
                          placeholder: "000000000000000",
                          help: "15 digits",
                          inputMode: "numeric",
                          maxLength: 15,
                        },
                      )}
                      {orgText(
                        "rc",
                        t("settings.rc", "Commercial register (RC)"),
                        {
                          mono: true,
                          placeholder: "00/00-0000000B00",
                          help: "Format 00/00-0000000B00",
                        },
                      )}
                      {orgText(
                        "ai",
                        t("settings.ai", "Article d'imposition (AI)"),
                        {
                          mono: true,
                          placeholder: "00000000000",
                          help: "11 digits",
                          inputMode: "numeric",
                          maxLength: 11,
                        },
                      )}
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    labelledBy="card-hq"
                    title={<>Headquarters{missingSign("headquarters")}</>}
                    description="The registered address of your organization."
                  >
                    <div className="os-grid">
                      {orgText(
                        "address",
                        t("settings.address", "Street address"),
                        {
                          placeholder: "12 Rue Didouche Mourad",
                          full: true,
                        },
                      )}
                      <Field
                        id="org-wilaya"
                        label={t("settings.wilaya", "Wilaya")}
                      >
                        <SelectInput
                          id="org-wilaya"
                          value={wilaya}
                          onChange={setWilaya}
                          options={WILAYA_OPTIONS}
                        />
                      </Field>
                      {orgText("commune", "Commune", {
                        placeholder: "Sidi M'Hamed",
                      })}
                      {orgText("postalCode", "Postal code", {
                        mono: true,
                        placeholder: "16000",
                        isOptional: true,
                        inputMode: "numeric",
                        maxLength: 5,
                      })}
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    labelledBy="card-regional"
                    title="Regional preferences"
                    description="Used for dates, amounts and the schedule of your digest."
                  >
                    <div className="os-grid os-grid-3">
                      <Field id="org-language" label="Language">
                        <SelectInput
                          id="org-language"
                          value={language}
                          onChange={setLanguage}
                          options={LANGUAGES}
                        />
                      </Field>
                      <Field id="org-timezone" label="Time zone">
                        <SelectInput
                          id="org-timezone"
                          value={timeZone}
                          onChange={setTimeZone}
                          options={TIME_ZONES}
                        />
                      </Field>
                      <Field id="org-currency" label="Currency">
                        <SelectInput
                          id="org-currency"
                          value={currency}
                          onChange={setCurrency}
                          options={CURRENCIES}
                        />
                      </Field>
                    </div>
                  </SettingsCard>

                  <SettingsCard
                    labelledBy="card-rep"
                    title={
                      <>Account representative{missingSign("representative")}</>
                    }
                    description="The person responsible for this organization's account."
                  >
                    <div className="os-grid">
                      {orgText(
                        "contactName",
                        t("settings.repName", "Full name"),
                        {
                          placeholder: "Amina Benali",
                        },
                      )}
                      {orgText("jobTitle", "Role & title", {
                        placeholder: "Marketing lead",
                      })}
                    </div>
                  </SettingsCard>
                </div>

                <FormActions
                  dirty={orgDirty}
                  saving={saving}
                  onDiscard={discardOrg}
                  saveIcon={<Save aria-hidden strokeWidth={2} />}
                  labels={formLabels}
                />
              </>
            )}

            {activeTab === "Team" && (
              <TeamTab
                soonLabel={soon}
                me={
                  profile
                    ? {
                        fullName: profile.full_name,
                        email: profile.email,
                        role: profile.role,
                      }
                    : null
                }
              />
            )}

            {activeTab === "Notifications" && (
              <>
                <section
                  className="os-card"
                  aria-labelledby="card-channels"
                  style={{ overflow: "hidden" }}
                >
                  <header className="os-card-header">
                    <div>
                      <h3 id="card-channels" className="os-card-title">
                        Alert channels
                      </h3>
                      <p className="os-card-desc">
                        Turn each alert on or off per channel.
                      </p>
                    </div>
                  </header>
                  <div className="os-matrix-scroll">
                    <div
                      className="os-matrix"
                      role="group"
                      aria-labelledby="card-channels"
                    >
                      <div className="os-matrix-row os-matrix-head" aria-hidden>
                        <span />
                        {CHANNELS.map((channel) => (
                          <span key={channel}>{CHANNEL_LABELS[channel]}</span>
                        ))}
                      </div>
                      {ALERT_GROUPS.map((group) => (
                        <div
                          key={group.caption}
                          role="group"
                          aria-label={group.caption}
                        >
                          <p className="os-matrix-group os-caption">
                            {group.caption}
                          </p>
                          {group.alerts.map((alert) => (
                            <div key={alert.id} className="os-matrix-row">
                              <div>
                                <p className="os-row-title">{alert.title}</p>
                                {alert.id === "stock" ? (
                                  <p className="os-row-sub">
                                    <label htmlFor="stock-threshold">
                                      Warn administrators when stock drops below
                                    </label>
                                    <input
                                      id="stock-threshold"
                                      type="text"
                                      inputMode="numeric"
                                      dir="ltr"
                                      maxLength={2}
                                      value={stockThreshold}
                                      onChange={(event) =>
                                        setStockThreshold(
                                          event.target.value.replace(/\D/g, ""),
                                        )
                                      }
                                      className="os-input os-mono os-inline-input"
                                    />
                                    %
                                  </p>
                                ) : (
                                  <p className="os-row-sub">
                                    {alert.description}
                                  </p>
                                )}
                              </div>
                              {CHANNELS.map((channel) => (
                                <Switch
                                  key={channel}
                                  label={`${alert.title} by ${CHANNEL_LABELS[channel]}`}
                                  checked={alerts[alert.id][channel]}
                                  onChange={(checked) =>
                                    setAlerts((now) => ({
                                      ...now,
                                      [alert.id]: {
                                        ...now[alert.id],
                                        [channel]: checked,
                                      },
                                    }))
                                  }
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="os-card" aria-labelledby="card-digest">
                  <header
                    className="os-card-header"
                    style={{ alignItems: "center" }}
                  >
                    <div>
                      <h3 id="card-digest" className="os-card-title">
                        Scheduled Performance digest
                      </h3>
                      <p id="card-digest-desc" className="os-card-desc">
                        An executive PDF summary of all active campaigns, sent
                        every week or every month.
                      </p>
                    </div>
                    <Switch
                      checked={digestEnabled}
                      onChange={setDigestEnabled}
                      labelledBy="card-digest"
                      describedById="card-digest-desc"
                    />
                  </header>
                  {digestEnabled ? (
                    <div className="os-card-body">
                      <div className="os-grid os-grid-3">
                        <Field id="digest-frequency" label="Frequency">
                          <SelectInput
                            id="digest-frequency"
                            value={digestFrequency}
                            onChange={setDigestFrequency}
                            options={DIGEST_FREQUENCIES}
                          />
                        </Field>
                        {digestFrequency === "week" ? (
                          <Field id="digest-day" label="Send on">
                            <SelectInput
                              id="digest-day"
                              value={digestDay}
                              onChange={setDigestDay}
                              options={DAYS}
                            />
                          </Field>
                        ) : (
                          <Field id="digest-month-day" label="Send on">
                            <SelectInput
                              id="digest-month-day"
                              value={digestMonthDay}
                              onChange={setDigestMonthDay}
                              options={MONTH_DAYS}
                            />
                          </Field>
                        )}
                        <Field id="digest-time" label="At">
                          <SelectInput
                            id="digest-time"
                            value={digestTime}
                            onChange={setDigestTime}
                            options={TIMES}
                          />
                        </Field>
                      </div>
                      <p
                        className="os-label"
                        style={{ margin: "20px 0 8px" }}
                        id="digest-recipients"
                      >
                        Recipients
                      </p>
                      <div
                        className="os-chips"
                        role="group"
                        aria-labelledby="digest-recipients"
                      >
                        {recipients.map((recipient) => (
                          <Chip
                            key={recipient}
                            label={recipient}
                            removeLabel={`Remove ${recipient}`}
                            onRemove={() =>
                              setRecipients((now) =>
                                now.filter((item) => item !== recipient),
                              )
                            }
                          />
                        ))}
                        {recipientDraft !== null ? (
                          <>
                            <label htmlFor="new-recipient" className="sr-only">
                              New recipient's email
                            </label>
                            <TextInput
                              id="new-recipient"
                              type="email"
                              autoFocus
                              placeholder="name@company.com"
                              value={recipientDraft}
                              style={{ width: 240, height: 36 }}
                              onChange={(event) =>
                                setRecipientDraft(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Escape")
                                  setRecipientDraft(null);
                                if (event.key !== "Enter") return;
                                event.preventDefault();
                                const value = recipientDraft
                                  .trim()
                                  .toLowerCase();
                                if (
                                  EMAIL.test(value) &&
                                  !recipients.includes(value)
                                ) {
                                  setRecipients((now) => [...now, value]);
                                }
                                setRecipientDraft(null);
                              }}
                              onBlur={() => setRecipientDraft(null)}
                            />
                          </>
                        ) : (
                          <button
                            type="button"
                            className="os-btn os-btn-secondary os-btn-sm"
                            onClick={() => setRecipientDraft("")}
                          >
                            <Plus aria-hidden strokeWidth={2} />
                            Add recipient
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 24 }} />
                  )}
                </section>

                <FormActions
                  dirty={notificationsDirty}
                  saving={saving}
                  onDiscard={discardNotifications}
                  saveIcon={<Save aria-hidden strokeWidth={2} />}
                  labels={formLabels}
                />
              </>
            )}

            {activeTab === "Security" && (
              <>
                <SettingsCard
                  labelledBy="card-password"
                  title="Change password"
                  description="Use a long, unique password that you do not use anywhere else."
                >
                  <Field
                    id="current-password"
                    label={t("settings.currentPassword", "Current password")}
                    className="os-narrow"
                  >
                    <PasswordInput
                      id="current-password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      {...passwordToggle}
                    />
                  </Field>
                  <Divider />
                  <div className="os-password-columns">
                    <div>
                      <div className="os-field">
                        <label htmlFor="new-password" className="os-label">
                          {t("settings.newPassword", "New password")}
                        </label>
                        <PasswordInput
                          id="new-password"
                          autoComplete="new-password"
                          value={newPassword}
                          aria-describedby="password-strength"
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                          {...passwordToggle}
                        />
                        <div className="os-strength" aria-hidden>
                          {[1, 2, 3, 4].map((segment) => (
                            <span
                              key={segment}
                              className="os-strength-segment"
                              data-level={level >= segment ? level : undefined}
                            />
                          ))}
                        </div>
                        <p
                          id="password-strength"
                          className="os-help"
                          aria-live="polite"
                        >
                          Strength: {newPassword ? STRENGTH_LABELS[level] : "—"}
                        </p>
                      </div>
                      <Field
                        id="confirm-password"
                        label={t(
                          "settings.confirmPassword",
                          "Confirm new password",
                        )}
                        error={
                          mismatch ? "The two passwords do not match." : null
                        }
                      >
                        <PasswordInput
                          id="confirm-password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          aria-invalid={mismatch || undefined}
                          aria-describedby={
                            mismatch ? "confirm-password-error" : undefined
                          }
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          {...passwordToggle}
                        />
                      </Field>
                    </div>
                    <div>
                      <p className="os-label" id="password-rules">
                        Your password must include
                      </p>
                      <ul
                        className="os-checklist"
                        aria-labelledby="password-rules"
                      >
                        {rules.map((rule) => (
                          <li key={rule.id}>
                            <span
                              className="os-check"
                              data-met={rule.met ? "" : undefined}
                              aria-hidden
                            >
                              {rule.met && <Check strokeWidth={3} />}
                            </span>
                            <span>
                              {rule.label}
                              <span className="sr-only">
                                {rule.met ? " (done)" : " (not yet)"}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="os-card-actions">
                    <button
                      type="submit"
                      className="os-btn os-btn-primary"
                      disabled={saving || !passwordReady}
                      aria-busy={saving || undefined}
                    >
                      <Save aria-hidden strokeWidth={2} />
                      {saving
                        ? t("settings.saving", "Saving...")
                        : t("settings.updatePassword", "Update password")}
                    </button>
                  </div>
                </SettingsCard>

                <CompactCard
                  labelledBy="card-2fa"
                  tile={
                    <IconTile>
                      <ShieldCheck strokeWidth={2} />
                    </IconTile>
                  }
                  title="Two-step verification"
                  badge={<Badge tone="warn">Off</Badge>}
                  description="Ask for a code from an authenticator app each time you sign in. Recommended for anyone who manages campaigns and rewards."
                  actions={
                    <button
                      type="button"
                      className="os-btn os-btn-primary"
                      disabled
                      title={soon}
                    >
                      Set up
                    </button>
                  }
                />

                <SettingsCard
                  labelledBy="card-sessions"
                  title="Active sessions"
                  description="Devices currently signed in to your account."
                  flush
                  aside={
                    <button
                      type="button"
                      className="os-btn os-btn-secondary os-btn-sm"
                      disabled
                      title={soon}
                    >
                      Sign out of other devices
                    </button>
                  }
                >
                  <div className="os-row">
                    <IconTile variant="outline">
                      {device.mobile ? (
                        <Smartphone strokeWidth={2} />
                      ) : (
                        <Monitor strokeWidth={2} />
                      )}
                    </IconTile>
                    <div className="os-row-main">
                      <p className="os-row-title">{device.name}</p>
                      <p className="os-row-sub">Active now</p>
                    </div>
                    <Badge tone="ok">This device</Badge>
                  </div>
                </SettingsCard>
              </>
            )}

            {activeTab === "Email" && (
              <SettingsCard
                labelledBy="card-email"
                title="Change email address"
                description="We will send a confirmation link to the new address before anything changes."
              >
                <div className="os-grid">
                  <Field
                    id="current-email"
                    label={t("settings.currentEmail", "Current email")}
                    labelAside={<Badge tone="ok">Verified</Badge>}
                  >
                    <TextInput
                      id="current-email"
                      type="email"
                      value={contactEmail}
                      readOnly
                    />
                  </Field>
                  <Field
                    id="new-email"
                    label={t("settings.newEmail", "New email")}
                  >
                    <TextInput
                      id="new-email"
                      type="email"
                      dir="auto"
                      autoComplete="email"
                      value={newEmail}
                      placeholder="name@company.com"
                      onChange={(event) => setNewEmail(event.target.value)}
                    />
                  </Field>
                  <Field
                    id="email-password"
                    label="Confirm with your password"
                    help="Asked for your security, since this address is used to recover your account."
                    full
                    className="os-narrow"
                  >
                    <PasswordInput
                      id="email-password"
                      autoComplete="current-password"
                      value={emailPassword}
                      aria-describedby="email-password-help"
                      onChange={(event) => setEmailPassword(event.target.value)}
                      {...passwordToggle}
                    />
                  </Field>
                </div>
                <div style={{ marginTop: 20 }}>
                  <Note title="What happens next">
                    <ol>
                      <li>
                        You receive a confirmation link at the new address.
                      </li>
                      <li>
                        Your current email keeps working until you confirm.
                      </li>
                      <li>
                        After confirming, you sign in with the new address.
                      </li>
                    </ol>
                  </Note>
                </div>
                <div className="os-card-actions">
                  <button
                    type="submit"
                    className="os-btn os-btn-primary"
                    disabled={saving || !newEmail.trim()}
                    aria-busy={saving || undefined}
                  >
                    <Mail aria-hidden strokeWidth={2} />
                    {saving
                      ? t("settings.saving", "Saving...")
                      : "Send confirmation email"}
                  </button>
                </div>
              </SettingsCard>
            )}

            {activeTab === "Integrations" && <IntegrationsTab />}

            {activeTab === "Billing" && (
              <BillingTab
                organizationId={organization?.id ?? null}
                plan={organization?.plan ?? "free"}
                onGoToOrganization={() => goTo("Organization")}
                details={[
                  { label: "Company name", value: orgName },
                  { label: "Billing email", value: orgContactEmail },
                  { label: "Tax identification (NIF)", value: nif },
                  {
                    label: "Headquarters address",
                    value: address.trim()
                      ? [address, commune, wilaya.replace(/^\d+ - /, "")]
                          .filter((part) => part.trim())
                          .join(", ")
                      : "",
                  },
                ]}
              />
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
