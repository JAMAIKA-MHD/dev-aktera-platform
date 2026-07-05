import React, { useState, useEffect } from 'react';
import { User, Shield, Building2, Check, Bell, Save, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';

export const AccountSettings: React.FC = () => {
  const { profile, organization, refreshProfile } = useAuth();

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state — initialized from real auth data
  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Algerian business identity fields (no DB columns yet — display only for MVP)
  const [nif, setNif] = useState('');
  const [rc, setRc] = useState('');
  const [telegramAlerts, setTelegramAlerts] = useState(false);

  // Populate form from auth data once loaded
  useEffect(() => {
    if (organization) setOrgName(organization.name);
    if (profile) {
      setContactName(profile.full_name);
      setContactEmail(profile.email);
    }
  }, [organization, profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Update organization name
      if (organization && orgName.trim() !== organization.name) {
        const { error: orgErr } = await supabase
          .from('organizations')
          .update({ name: orgName.trim() })
          .eq('id', organization.id);
        if (orgErr) throw orgErr;
      }

      // Update profile full name
      if (profile && contactName.trim() !== profile.full_name) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ full_name: contactName.trim() })
          .eq('id', profile.id);
        if (profileErr) throw profileErr;
      }

      // Email changes go through Supabase Auth (requires re-confirmation)
      if (profile && contactEmail.trim().toLowerCase() !== profile.email.toLowerCase()) {
        const { error: emailErr } = await supabase.auth.updateUser({
          email: contactEmail.trim().toLowerCase(),
        });
        if (emailErr) throw emailErr;
      }

      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      setError(toFriendlyErrorMessage(err, 'Failed to save settings.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="account-settings-root" className="max-w-2xl mx-auto space-y-6 text-slate-800 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Organization & NIF Registration</h2>
          <p className="text-slate-500 text-xs mt-0.5">Edit billing details, company identification codes, and representative alerts.</p>
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

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-semibold flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-emerald-500" />
          <span>Organization settings saved successfully!</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
        
        <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2 border-b border-gray-200 pb-3">
          <Building2 className="w-4 h-4 text-indigo-500" />
          <span>Algerian Commercial Identity</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Org name */}
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

          {/* Contact email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Primary Billing Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none"
              required
            />
          </div>

          {/* Algerian NIF */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Numéro d'Identification Fiscale (NIF)
            </label>
            <div className="relative">
              <input
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                maxLength={15}
                className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-50 border border-emerald-200 text-emerald-600 text-[9px] px-2 py-0.5 rounded-md uppercase font-mono font-bold">
                Verified NIF
              </span>
            </div>
          </div>

          {/* Algerian Registre de Commerce (RC) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Registre de Commerce (RC)
            </label>
            <input
              type="text"
              value={rc}
              onChange={(e) => setRc(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none font-mono"
            />
          </div>

          {/* Contact name */}
          <div className="col-span-full flex flex-col gap-1.5 border-t border-gray-200 pt-4 mt-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>Assigned Campaign Representative</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 min-h-11 focus:outline-none"
              required
            />
          </div>

        </div>

        {/* Alerts setting */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex justify-between items-center mt-4">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-indigo-500 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-700 block">Telegram Low-Stock Alert Logs</span>
              <span className="text-[10px] text-slate-500">Auto-ping active warehouse managers when stock dips below 50.</span>
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

        {/* Submit */}
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
