import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, Building2, Check, Save, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';

export const AccountSettings: React.FC = () => {
  const { profile, organization, user, refreshProfile } = useAuth();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [orgName, setOrgName] = useState('');
  const [orgContactEmail, setOrgContactEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [nif, setNif] = useState('');
  const [rc, setRc] = useState('');
  const [telegramAlerts, setTelegramAlerts] = useState(false);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      setOrgContactEmail(organization.contact_email ?? '');
      setOrgPhone(organization.phone_number ?? '');
    }
    if (profile) {
      setContactName(profile.full_name);
      setContactEmail(profile.email);
    }
  }, [organization, profile]);

  const representativeName = useMemo(
    () => contactName.trim() || 'Assigned representative',
    [contactName],
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      if (!organization || !profile) {
        throw new Error('Your organization profile is unavailable. Please refresh and try again.');
      }

      const normalizedOrgName = orgName.trim();
      const normalizedOrgEmail = orgContactEmail.trim().toLowerCase();
      const normalizedOrgPhone = orgPhone.trim();
      const normalizedFullName = contactName.trim();
      const normalizedLoginEmail = contactEmail.trim().toLowerCase();
      const currentAuthEmail = (user?.email ?? profile.email ?? '').trim().toLowerCase();
      const loginEmailChanged = normalizedLoginEmail !== currentAuthEmail;

      const { error: orgErr } = await supabase
        .from('organizations')
        .update({
          name: normalizedOrgName,
          contact_email: normalizedOrgEmail,
          phone_number: normalizedOrgPhone || null,
        })
        .eq('id', organization.id);
      if (orgErr) throw orgErr;

      let emailUpdatedImmediately = false;
      let emailUpdatePendingConfirmation = false;

      if (loginEmailChanged) {
        const { data: authUpdateData, error: emailErr } = await supabase.auth.updateUser({
          email: normalizedLoginEmail,
        });
        if (emailErr) throw emailErr;

        emailUpdatedImmediately = (authUpdateData.user?.email ?? '').toLowerCase() === normalizedLoginEmail;
        emailUpdatePendingConfirmation = !emailUpdatedImmediately;
      }

      const profilePatch: { full_name: string; email?: string } = {
        full_name: normalizedFullName,
      };

      if (!loginEmailChanged || emailUpdatedImmediately) {
        profilePatch.email = normalizedLoginEmail;
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .update(profilePatch)
        .eq('id', profile.id);
      if (profileErr) throw profileErr;

      await refreshProfile();

      setSuccessMessage(
        loginEmailChanged && emailUpdatePendingConfirmation
          ? 'Organization details saved. Confirm the email link sent to your new login address before signing in with it.'
          : 'Organization settings saved successfully!',
      );
      window.setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="account-settings-root" className="max-w-3xl mx-auto space-y-6 text-slate-800 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Organization & Tax Registration</h2>
          <p className="text-slate-500 text-xs mt-0.5">Manage organization contact details, representative identity, and alert preferences.</p>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-semibold flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-emerald-500" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div>
          <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2 border-b border-gray-200 pb-3">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>Organization profile</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Organization Contact Email</label>
              <input
                type="email"
                value={orgContactEmail}
                onChange={(e) => setOrgContactEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Organization Phone Number</label>
              <input
                type="tel"
                value={orgPhone}
                onChange={(e) => setOrgPhone(e.target.value)}
                placeholder="e.g. 0555123456"
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Representative Login Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none"
                required
              />
              <p className="text-[10px] text-slate-400">
                Changing the login email may require confirmation through Supabase Auth.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2 border-b border-gray-200 pb-3">
            <User className="w-4 h-4 text-indigo-500" />
            <span>Representative identity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Assigned Campaign Representative</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Tax Identification Number (NIF)</label>
              <input
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                maxLength={15}
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Commercial Register (RC)</label>
              <input
                type="text"
                value={rc}
                onChange={(e) => setRc(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex justify-between items-center">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-700 block">Low-stock alert preview</span>
              <span className="text-[10px] text-slate-500">
                Preview preference only for now. Active warehouse alerts will be wired in a later automation milestone.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTelegramAlerts(!telegramAlerts)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
              telegramAlerts ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow transition-all duration-200 ${
              telegramAlerts ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-600">
          <p>
            Representative on file: <strong className="text-slate-800">{representativeName}</strong>. Organization contact email and phone are now saved separately from the representative login email.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all min-h-11 shadow-md shadow-indigo-600/20"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
