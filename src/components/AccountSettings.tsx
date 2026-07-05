import React, { useState } from 'react';
import { User, Shield, Building2, Check, Bell, Save } from 'lucide-react';
import { motion } from 'motion/react';

export const AccountSettings: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const [orgName, setOrgName] = useState('Djezzy Algeria Telecom');
  const [nif, setNif] = useState('001234567890123'); // Algerian NIF (Numéro d'Identification Fiscale)
  const [rc, setRc] = useState('16/00-123456B26'); // Algerian RC (Registre du Commerce)
  const [contactName, setContactName] = useState('Abdelkader Benzine');
  const [contactEmail, setContactEmail] = useState('a.benzine@djezzy.dz');
  const [telegramAlerts, setTelegramAlerts] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div id="account-settings-root" className="max-w-2xl mx-auto space-y-6 text-slate-100 pb-12">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2D2D3F]/60 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Organization & NIF Registration</h2>
          <p className="text-slate-400 text-xs mt-0.5">Edit billing details, company identification codes, and representative alerts.</p>
        </div>
      </div>

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-2"
        >
          <Check className="w-4.5 h-4.5 text-emerald-400" />
          <span>Organization settings saved successfully!</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="bg-[#161625]/90 border border-[#2D2D3F]/70 rounded-3xl p-6 space-y-5 shadow-lg">
        
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2 border-b border-[#2D2D3F] pb-3">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span>Algerian Commercial Identity</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Org name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-[#0F0F1A] border border-[#2D2D3F] hover:border-slate-600 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-100 min-h-11 focus:outline-none"
              required
            />
          </div>

          {/* Contact email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Primary Billing Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full bg-[#0F0F1A] border border-[#2D2D3F] hover:border-slate-600 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-100 min-h-11 focus:outline-none"
              required
            />
          </div>

          {/* Algerian NIF */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Numéro d'Identification Fiscale (NIF)
            </label>
            <div className="relative">
              <input
                type="text"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                maxLength={15}
                className="w-full bg-[#0F0F1A] border border-[#2D2D3F] hover:border-slate-600 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-100 min-h-11 focus:outline-none font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded-md uppercase font-mono font-bold">
                Verified NIF
              </span>
            </div>
          </div>

          {/* Algerian Registre de Commerce (RC) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Registre de Commerce (RC)
            </label>
            <input
              type="text"
              value={rc}
              onChange={(e) => setRc(e.target.value)}
              className="w-full bg-[#0F0F1A] border border-[#2D2D3F] hover:border-slate-600 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-100 min-h-11 focus:outline-none font-mono"
            />
          </div>

          {/* Contact name */}
          <div className="col-span-full flex flex-col gap-1.5 border-t border-[#2D2D3F] pt-4 mt-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>Assigned Campaign Representative</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full bg-[#0F0F1A] border border-[#2D2D3F] hover:border-slate-600 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-100 min-h-11 focus:outline-none"
              required
            />
          </div>

        </div>

        {/* Alerts setting */}
        <div className="bg-[#0F0F1A] border border-[#2D2D3F] rounded-2xl p-4 flex justify-between items-center mt-4">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-indigo-400 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-300 block">Telegram Low-Stock Telegram Alert Logs</span>
              <span className="text-[10px] text-slate-500">Auto-ping active warehouse managers when stock dips below 50.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTelegramAlerts(!telegramAlerts)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
              telegramAlerts ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-all duration-200 ${
              telegramAlerts ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Submit Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer transition-all min-h-11 shadow-lg shadow-indigo-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>

      </form>

    </div>
  );
};
