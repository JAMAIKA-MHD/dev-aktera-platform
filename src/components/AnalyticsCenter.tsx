import React, { useState } from 'react';
import { Campaign, LeadEntry } from '../types';
import { BarChart3, TrendingUp, Users, Award, Download, Clock, MapPin, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalyticsCenterProps {
  campaigns: Campaign[];
  leads: LeadEntry[];
}

export const AnalyticsCenter: React.FC<AnalyticsCenterProps> = ({ campaigns, leads }) => {
  const [selectedCampId, setSelectedCampId] = useState<string>('all');

  // Filter leads based on selection
  const filteredLeads = selectedCampId === 'all' 
    ? leads 
    : leads.filter(l => l.campaignId === selectedCampId);

  // Stats calculation
  const totalLeads = filteredLeads.length;
  const totalWins = filteredLeads.filter(l => l.prizeWon && l.prizeWon !== 'Better Luck Next Time').length;
  const winPercentage = totalLeads > 0 ? ((totalWins / totalLeads) * 100).toFixed(1) : '0';

  // Localized hourly split simulator
  const hourlyData = [
    { hour: '00:00 - 04:00 (S\'hour)', count: 32, label: 'Shour peak' },
    { hour: '04:00 - 08:00 (Fajr)', count: 8, label: 'Calm morning' },
    { hour: '08:00 - 12:00', count: 18, label: 'Work hours' },
    { hour: '12:00 - 16:00', count: 24, label: 'Midday traffic' },
    { hour: '16:00 - 20:00 (Iftar)', count: 15, label: 'Sunset prep' },
    { hour: '20:00 - 00:00 (Tarawih)', count: 48, label: 'Night rush 🔥' },
  ];

  // Geolocation split simulator (Algerian regions)
  const regionData = [
    { name: 'Algiers (الجزائر)', percentage: 42, count: '1,900' },
    { name: 'Oran (وهران)', percentage: 22, count: '1,000' },
    { name: 'Constantine (قسنطينة)', percentage: 18, count: '810' },
    { name: 'Annaba (عنابة)', percentage: 10, count: '450' },
    { name: 'Ouargla / Ghardaïa (الجنوب)', percentage: 8, count: '360' },
  ];

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,ID,Campaign_Name,Player_Name,Phone,Prize_Won,Timestamp,Status\n" + 
      filteredLeads.map(l => `${l.id},"${l.campaignName}","${l.playerName}",${l.phoneNumber},"${l.prizeWon || 'Better Luck'}",${l.timestamp},${l.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dzengage_analytics_export_${selectedCampId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="analytics-center-root" className="space-y-6 text-slate-800">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Campaign Analytics Desk</h2>
          <p className="text-slate-500 text-xs mt-0.5">Understand peak traffic hour spikes, regional participation, and winner rates.</p>
        </div>

        {/* Campaign Filter select */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCampId}
            onChange={(e) => setSelectedCampId(e.target.value)}
            className="bg-white border border-slate-250 hover:border-slate-400 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none min-h-11 shadow-sm cursor-pointer font-sans"
          >
            <option value="all">All Campaigns Combined</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-11 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Leads</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: 'Campaign Sample Entries', value: totalLeads, desc: 'Zero-party consumer forms submitted', icon: Users, color: 'text-indigo-600', bg: 'bg-white border border-slate-200 shadow-sm' },
          { title: 'Calculated Wins', value: totalWins, desc: 'Vouchers & physical items claimed', icon: Award, color: 'text-emerald-600', bg: 'bg-white border border-slate-200 shadow-sm' },
          { title: 'Win-to-Loss Ratio', value: `${winPercentage}%`, desc: 'Optimized reward conversions', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-white border border-slate-200 shadow-sm' }
        ].map((stat, idx) => (
          <div key={idx} className={`${stat.bg} rounded-[24px] p-5`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">{stat.title}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <h4 className="text-3xl font-extrabold mt-3 mb-1 text-slate-900">{stat.value}</h4>
            <p className="text-[11px] text-slate-500">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Multi-charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Hourly peaks (Ramadan split) */}
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-850">Algerian Hour-of-Day Footprint</h3>
              <p className="text-[10px] text-slate-500">Notice the heavy increase in activity during Ramadan night rush times</p>
            </div>
          </div>

          {/* Render styled bar chart */}
          <div className="space-y-3 pt-2">
            {hourlyData.map((d, idx) => {
              const maxVal = Math.max(...hourlyData.map(item => item.count));
              const widthPct = (d.count / maxVal) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-600">{d.hour}</span>
                    <span className="text-indigo-600 font-bold">{d.count} entries ({d.label})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Geographic location split */}
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-850">Algerian Regional Split (Wilaya)</h3>
              <p className="text-[10px] text-slate-500">Main provinces capturing promotional interactions</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {regionData.map((r, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">{r.name}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{r.percentage}% ({r.count} users)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Optimization intelligence tip */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-[28px] p-5 shadow-sm flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-xs font-bold text-indigo-900">Algerian Ad-Spending Intelligence Tip</span>
          <p className="text-[11px] text-indigo-850 leading-relaxed mt-0.5 font-sans">
            Tarawih and S'hour hours (20:00 - 04:00) represent over <strong>70% of absolute traffic</strong> in your campaign. We highly recommend triggering higher payout rates or larger Flexy Internet vouchers during these periods to optimize lead conversion.
          </p>
        </div>
      </div>

    </div>
  );
};
