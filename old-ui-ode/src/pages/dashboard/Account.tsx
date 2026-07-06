import { useEffect, useMemo, useState } from 'react';
import { Bell, Building2, Check, RefreshCw, Save, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Phase2InlineNotice } from '../../features/phase2-ui';
import { supabase } from '../../lib/supabase';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';

interface ProfileFormState {
  full_name: string;
  email: string;
}

interface OrganizationFormState {
  name: string;
  contact_email: string;
  phone_number: string;
}

export default function Account() {
  const { profile, organization, user, refreshProfile } = useAuth();
  const [profileForm, setProfileForm] = useState<ProfileFormState>({ full_name: '', email: '' });
  const [organizationForm, setOrganizationForm] = useState<OrganizationFormState>({
    name: '',
    contact_email: '',
    phone_number: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [telegramAlerts, setTelegramAlerts] = useState(true);
  const [nif, setNif] = useState('001234567890123');
  const [rc, setRc] = useState('16/00-123456B26');

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name ?? '',
      email: profile?.email ?? '',
    });
    setOrganizationForm({
      name: organization?.name ?? '',
      contact_email: organization?.contact_email ?? '',
      phone_number: organization?.phone_number ?? '',
    });
  }, [profile, organization]);

  const representativeName = useMemo(() => profileForm.full_name.trim() || 'Assigned representative', [profileForm.full_name]);

  const getFriendlyEmailUpdateError = (rawError: unknown) => {
    const message = rawError instanceof Error ? rawError.message.toLowerCase() : String(rawError ?? '').toLowerCase();
    if (
      message.includes('already registered') ||
      message.includes('already been registered') ||
      message.includes('already in use') ||
      message.includes('already exists')
    ) {
      return 'This email is already used by another account.';
    }
    if (message.includes('rate limit')) {
      return 'Too many email change requests. Please wait a moment and try again.';
    }
    return toFriendlyErrorMessage(rawError, {
      fallback: 'Unable to update login email. Please try again.',
      duplicate: 'This email is already used by another account.',
    });
  };

  const handleSaveProfile = async () => {
    if (!profile) {
      setError('Your profile is unavailable. Please sign in again.');
      return;
    }

    const normalizedFullName = profileForm.full_name.trim();
    const normalizedEmail = profileForm.email.trim().toLowerCase();
    const currentAuthEmail = (user?.email ?? profile.email ?? '').trim().toLowerCase();
    const emailChanged = normalizedEmail !== currentAuthEmail;

    setSavingProfile(true);
    setMessage(null);
    setError(null);

    let emailUpdatePendingConfirmation = false;
    let emailUpdatedImmediately = false;

    if (emailChanged) {
      const { data: authUpdateData, error: authUpdateError } = await supabase.auth.updateUser({
        email: normalizedEmail,
      });

      if (authUpdateError) {
        setError(getFriendlyEmailUpdateError(authUpdateError));
        setSavingProfile(false);
        return;
      }

      emailUpdatedImmediately = (authUpdateData.user?.email ?? '').toLowerCase() === normalizedEmail;
      emailUpdatePendingConfirmation = !emailUpdatedImmediately;
    }

    const profilePatch: { full_name: string; email?: string } = { full_name: normalizedFullName };
    if (!emailChanged || emailUpdatedImmediately) {
      profilePatch.email = normalizedEmail;
    }

    const { error: updateError } = await supabase.from('profiles').update(profilePatch).eq('id', profile.id);

    if (updateError) {
      if (emailChanged && emailUpdatePendingConfirmation) {
        setError('We sent the confirmation email, but profile details were not fully saved. Please confirm your new email and try saving again.');
      } else if (emailChanged && emailUpdatedImmediately) {
        setError('Your login email was updated, but syncing your profile record failed. Please try saving your profile again.');
      } else {
        setError(toFriendlyErrorMessage(updateError, { fallback: 'Unable to save profile.' }));
      }
      setSavingProfile(false);
      return;
    }

    await refreshProfile();
    if (emailChanged && emailUpdatePendingConfirmation) {
      setMessage('Profile updated. Confirm the email link sent to your new address before signing in with it.');
    } else if (emailChanged && emailUpdatedImmediately) {
      setMessage('Profile and login email updated successfully.');
    } else {
      setMessage('Profile updated successfully.');
    }
    setSavingProfile(false);
  };

  const handleSaveOrganization = async () => {
    if (!organization) {
      setError('Your organization is unavailable. Please refresh and try again.');
      return;
    }

    setSavingOrganization(true);
    setMessage(null);
    setError(null);

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        name: organizationForm.name.trim(),
        contact_email: organizationForm.contact_email.trim().toLowerCase(),
        phone_number: organizationForm.phone_number.trim() || null,
      })
      .eq('id', organization.id);

    if (updateError) {
      setError(toFriendlyErrorMessage(updateError, { fallback: 'Unable to save organization.' }));
      setSavingOrganization(false);
      return;
    }

    await refreshProfile();
    setMessage('Organization updated successfully.');
    setSavingOrganization(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 text-slate-100">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-[#2D2D3F]/60 pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Organization & NIF Registration</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Edit billing details, company identification codes, and representative alerts.
          </p>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{message}</span>
          </div>
        </div>
      ) : null}
      {error ? <Phase2InlineNotice tone="danger">{error}</Phase2InlineNotice> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#2D2D3F]/70 bg-[#161625]/90 p-6 shadow-lg">
            <h3 className="flex items-center gap-2 border-b border-[#2D2D3F] pb-3 text-sm font-bold text-slate-200">
              <Building2 className="h-4 w-4 text-indigo-400" />
              <span>Algerian Commercial Identity</span>
            </h3>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Organization Name</label>
                <input
                  type="text"
                  value={organizationForm.name}
                  onChange={(event) => setOrganizationForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="touch-target min-h-11 rounded-xl border border-[#2D2D3F] bg-[#0F0F1A] px-4 text-xs text-slate-100 outline-none transition hover:border-slate-600 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Primary Billing Email</label>
                <input
                  type="email"
                  value={organizationForm.contact_email}
                  onChange={(event) => setOrganizationForm((prev) => ({ ...prev, contact_email: event.target.value }))}
                  className="touch-target min-h-11 rounded-xl border border-[#2D2D3F] bg-[#0F0F1A] px-4 text-xs text-slate-100 outline-none transition hover:border-slate-600 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Numéro d&apos;Identification Fiscale (NIF)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nif}
                    onChange={(event) => setNif(event.target.value)}
                    maxLength={15}
                    className="touch-target min-h-11 w-full rounded-xl border border-[#2D2D3F] bg-[#0F0F1A] px-4 pr-28 font-mono text-xs text-slate-100 outline-none transition hover:border-slate-600 focus:border-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
                    Preview
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Registre de Commerce (RC)
                </label>
                <input
                  type="text"
                  value={rc}
                  onChange={(event) => setRc(event.target.value)}
                  className="touch-target min-h-11 rounded-xl border border-[#2D2D3F] bg-[#0F0F1A] px-4 font-mono text-xs text-slate-100 outline-none transition hover:border-slate-600 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2 flex flex-col gap-1.5 border-t border-[#2D2D3F] pt-4 mt-1">
                <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <User className="h-3.5 w-3.5" />
                  <span>Assigned Campaign Representative</span>
                </label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, full_name: event.target.value }))}
                  className="touch-target min-h-11 rounded-xl border border-[#2D2D3F] bg-[#0F0F1A] px-4 text-xs text-slate-100 outline-none transition hover:border-slate-600 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Representative Login Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="touch-target min-h-11 rounded-xl border border-[#2D2D3F] bg-[#0F0F1A] px-4 text-xs text-slate-100 outline-none transition hover:border-slate-600 focus:border-indigo-500"
                  required
                />
                <p className="text-[10px] text-slate-500">
                  Email changes still follow the existing confirmation rules when the auth account requires it.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Organization Phone Number</label>
                <input
                  type="tel"
                  value={organizationForm.phone_number}
                  onChange={(event) => setOrganizationForm((prev) => ({ ...prev, phone_number: event.target.value }))}
                  className="touch-target min-h-11 rounded-xl border border-[#2D2D3F] bg-[#0F0F1A] px-4 text-xs text-slate-100 outline-none transition hover:border-slate-600 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="touch-target inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:shadow-none"
              >
                {savingProfile ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Profile Access</span>
              </button>
              <button
                type="button"
                onClick={handleSaveOrganization}
                disabled={savingOrganization}
                className="touch-target inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#2D2D3F] bg-[#1F1F2E] px-6 py-3 text-xs font-bold text-slate-100 transition hover:border-slate-600 hover:bg-[#26263A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingOrganization ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Organization</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[#2D2D3F]/70 bg-[#161625]/90 p-6 shadow-lg">
            <div className="flex items-center gap-2 border-b border-[#2D2D3F] pb-3">
              <Bell className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-200">Operations & Alert Routing</h3>
            </div>

            <div className="mt-5 rounded-2xl border border-[#2D2D3F] bg-[#0F0F1A] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-5 w-5 text-indigo-400" />
                  <div>
                    <span className="block text-xs font-bold text-slate-300">Telegram Low-Stock Alert Logs</span>
                    <span className="mt-1 block text-[10px] text-slate-500">
                      Auto-ping active warehouse managers when stock dips below 50. Preview-only until the backend settings model lands.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTelegramAlerts((previous) => !previous)}
                    className={`inline-flex h-7 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
                    telegramAlerts ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                >
                  <span
                      className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        telegramAlerts ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#2D2D3F] bg-[#0F0F1A] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current routed representative</p>
              <p className="mt-2 text-sm font-bold text-slate-200">{representativeName}</p>
              <p className="mt-1 text-xs text-slate-500">{profileForm.email || 'No email set yet'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#2D2D3F]/70 bg-[#161625]/90 p-6 shadow-lg">
            <h3 className="text-sm font-bold text-slate-200">Compliance Preview Notice</h3>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              The NIF, RC, and Telegram controls stay visible to preserve the preferred new UI. They are intentionally isolated until a later milestone adds secure persistence for those fields.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
