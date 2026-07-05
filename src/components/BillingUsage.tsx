import React, { useState } from 'react';
import { CreditCard, Check, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const BillingUsage: React.FC = () => {
  const [success, setSuccess] = useState('');

  const plans = [
    {
      name: 'Ramadan Starter',
      price: 'Free',
      period: 'For small businesses',
      features: [
        '1 Active Promo Portal',
        'Up to 1,000 Consumer Leads',
        'Basic Lucky Wheel Mechanic',
        'Algerian phone validation checks',
        'Standard Email Support',
      ],
      current: true,
      buttonText: 'Current Active Tier',
      buttonStyle: 'bg-[#1F1F2E] text-slate-300 border border-[#2D2D3F] cursor-not-allowed',
    },
    {
      name: 'Pro Activation',
      price: '4,500 DA',
      period: 'per month',
      features: [
        '5 Concurrent Portals',
        'Up to 10,000 Consumer Leads',
        'Full Darija/English Quiz Challenge',
        'Detailed Hourly Peak Analytics',
        'CSV Export + Custom Logos',
        'Priority Technical Support',
      ],
      current: false,
      buttonText: 'Upgrade with Algerian CIB / Edahabia',
      buttonStyle: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 cursor-pointer',
    },
    {
      name: 'Enterprise Bulk',
      price: 'Custom',
      period: 'for major telecoms & FMCG',
      features: [
        'Unlimited Live Portals',
        'Over 100,000 lead streams',
        'Custom SMS API integrations',
        'Dedicated server authority',
        'SLA 99.9% uptime guarantees',
      ],
      current: false,
      buttonText: 'Request Enterprise Demo',
      buttonStyle: 'bg-slate-800 hover:bg-slate-750 text-white cursor-pointer',
    }
  ];

  const handleUpgrade = (planName: string) => {
    setSuccess(`You have initiated the upgrade flow for ${planName}. Please supply your CIB or Edahabia details via client representative!`);
    setTimeout(() => setSuccess(''), 5000);
  };

  return (
    <div id="billing-usage-root" className="space-y-6 text-slate-100">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2D2D3F]/60 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Billing & Quota Room</h2>
          <p className="text-slate-400 text-xs mt-0.5">Track your monthly active portal consumption and upgrade to larger limits.</p>
        </div>
      </div>

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="p-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-2xl text-xs font-semibold flex items-center gap-2"
        >
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span>{success}</span>
        </motion.div>
      )}

      {/* Consumption meters */}
      <div className="bg-[#161625] border border-[#2D2D3F] rounded-3xl p-6 shadow-md grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="space-y-3.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider font-mono">Monthly Capture Leads Meter</span>
            <span className="text-indigo-400 font-bold font-mono">952 / 1,000 Captures</span>
          </div>
          <div className="w-full bg-[#0F0F1A] rounded-full h-3 overflow-hidden border border-[#2D2D3F]">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full" style={{ width: '95.2%' }} />
          </div>
          <p className="text-[10px] text-amber-400 flex items-center gap-1.5 font-sans leading-normal">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Nearing limit (95%). Upgrade plan below to avoid live promo shutoffs.</span>
          </p>
        </div>

        <div className="space-y-1.5 text-xs text-slate-400 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-[#2D2D3F] pt-4 md:pt-0">
          <p className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[10px]">Monthly active details:</p>
          <p>• <strong>Active portals:</strong> 1 live url</p>
          <p>• <strong>Telecom SMS integration quota:</strong> 0 / 100 free SMS used</p>
          <p>• <strong>Invoice cycle resets:</strong> July 31, 2026</p>
        </div>
      </div>

      {/* Pricing Comparison Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {plans.map((p, idx) => (
          <div 
            key={idx} 
            className={`bg-[#161625]/90 border rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden ${
              p.current ? 'border-indigo-500/50' : 'border-[#2D2D3F]/75'
            }`}
          >
            {p.current && (
              <div className="absolute right-0 top-0 bg-indigo-600 text-white text-[9px] font-bold px-3 py-1 uppercase tracking-widest rounded-bl-xl font-mono">
                Active Plan
              </div>
            )}

            <div>
              <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">{p.name}</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-extrabold text-slate-100">{p.price}</span>
                <span className="text-xs text-slate-500 font-mono">{p.period}</span>
              </div>

              {/* Feature list */}
              <ul className="space-y-3 mt-6 text-xs text-slate-300">
                {p.features.map((f, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => !p.current && handleUpgrade(p.name)}
              disabled={p.current}
              className={`w-full text-xs font-bold py-3.5 rounded-xl transition-all mt-8 min-h-11 ${p.buttonStyle}`}
            >
              {p.buttonText}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};
