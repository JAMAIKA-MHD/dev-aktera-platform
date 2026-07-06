import React from 'react';
import { motion } from 'motion/react';
import { Campaign, PrizeTemplate, LeadEntry } from '../types';
import { 
  Plus, TrendingUp, Users, Gift, CheckCircle2, 
  ArrowUpRight, AlertTriangle, ChevronRight, FileSpreadsheet, Search 
} from 'lucide-react';
import { DEFAULT_CAMPAIGN_IMAGE_URL } from '../lib/defaultImages';

interface DashboardHomeProps {
  campaigns: Campaign[];
  prizes: PrizeTemplate[];
  leads: LeadEntry[];
  onNavigate: (tab: any) => void;
  onSelectCampaign: (id: string) => void;
  onOpenWizard: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  campaigns,
  prizes,
  leads,
  onNavigate,
  onSelectCampaign,
  onOpenWizard
}) => {
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const totalParticipants = campaigns.reduce((acc, c) => acc + c.participantsCount, 0);
  const totalClaims = campaigns.reduce((acc, c) => acc + c.rewardsClaimed, 0);
  const conversionRate = totalParticipants > 0 ? ((totalClaims / totalParticipants) * 100).toFixed(1) : '0';

  // Find low stock items
  const lowStockPrizes = prizes.filter(p => p.availableStock < 50);

  return (
    <div id="b2b-dashboard-home" className="space-y-6 text-slate-800">
      
      {/* Top Welcome Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Welcome Back! 👋
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Track your zero-party consumer engagement & reward redemption across Algeria.
          </p>
        </div>
        <button
          onClick={onOpenWizard}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer min-h-12 text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Launch New Campaign</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Active Campaigns',
            value: activeCampaigns.length,
            desc: 'Running real-time wheels & quizzes',
            icon: TrendingUp,
            color: 'text-indigo-600',
            bg: 'bg-white border border-slate-250/80 shadow-[0_2px_8px_rgba(99,102,241,0.03)]'
          },
          {
            title: 'Consumer Leads Captured',
            value: totalParticipants.toLocaleString(),
            desc: 'Validated Algerian phone numbers',
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-white border border-slate-250/80 shadow-[0_2px_8px_rgba(16,185,129,0.03)]'
          },
          {
            title: 'Prizes Handed Out',
            value: totalClaims.toLocaleString(),
            desc: 'Vouchers & physical items claimed',
            icon: Gift,
            color: 'text-amber-600',
            bg: 'bg-white border border-slate-250/80 shadow-[0_2px_8px_rgba(245,158,11,0.03)]'
          },
          {
            title: 'Average Win Rate',
            value: `${conversionRate}%`,
            desc: 'Optimized reward conversions',
            icon: CheckCircle2,
            color: 'text-rose-600',
            bg: 'bg-white border border-slate-250/80 shadow-[0_2px_8px_rgba(244,63,94,0.03)]'
          }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-5 rounded-[24px] ${item.bg}`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                {item.title}
              </span>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <h3 className="text-3xl font-extrabold tracking-tight mt-3 mb-1 text-slate-900">
              {item.value}
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              {item.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Main split grid: Active Campaigns & Low stock warning + Recent leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Active Campaign List & Recent Leads */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Campaigns Card */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-800">Active Campaign Radios</h3>
                <p className="text-xs text-slate-500">Currently collecting zero-party consumer leads</p>
              </div>
              <button 
                onClick={() => onNavigate('campaigns')}
                className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {activeCampaigns.map((camp) => (
                <div 
                  key={camp.id}
                  onClick={() => onSelectCampaign(camp.id)}
                  className="bg-slate-50/60 border border-slate-100 hover:border-slate-300 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={camp.heroImageUrl || DEFAULT_CAMPAIGN_IMAGE_URL}
                      alt={`${camp.name} thumbnail`}
                      className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                      onError={(event) => {
                        event.currentTarget.src = DEFAULT_CAMPAIGN_IMAGE_URL;
                      }}
                    />
                    <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-sans text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {camp.name}
                      </span>
                      <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase font-mono">
                        {camp.type === 'lucky_wheel' ? 'Lucky Wheel' : 'Quiz Challenge'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">{camp.arabicName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{camp.participantsCount}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Participants</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{camp.rewardsClaimed}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-mono">Redeemed</p>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded-lg group-hover:bg-indigo-600 group-hover:border-indigo-500 text-slate-400 group-hover:text-white transition-colors duration-200">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
              {activeCampaigns.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  No campaigns currently active. Launch a new one to start collecting data!
                </div>
              )}
            </div>
          </div>

          {/* Recent Zero-Party Leads Captures */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-800">Live Algerian Lead Pipeline</h3>
                <p className="text-xs text-slate-500">Real consumers participating in your live digital portals</p>
              </div>
              <button 
                onClick={() => onNavigate('analytics')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-[38px]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Pipeline (CSV)</span>
              </button>
            </div>

            {/* Leads Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-mono text-slate-400 uppercase">
                    <th className="pb-3 pl-1 font-semibold">User Details</th>
                    <th className="pb-3 font-semibold">Campaign Name</th>
                    <th className="pb-3 font-semibold">Reward Distributed</th>
                    <th className="pb-3 font-semibold">Timestamp</th>
                    <th className="pb-3 pr-1 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {leads.slice(0, 5).map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pl-1">
                        <p className="font-bold text-slate-800">{lead.playerName}</p>
                        <p className="font-mono text-[10px] text-slate-400">{lead.phoneNumber}</p>
                      </td>
                      <td className="py-3 font-medium text-slate-600">{lead.campaignName}</td>
                      <td className="py-3">
                        {lead.prizeWon && lead.prizeWon !== 'Better Luck Next Time' ? (
                          <div className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                            <Gift className="w-3.5 h-3.5" />
                            <span>{lead.prizeWon}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">None (Wheel spin fail)</span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-slate-500 text-[10px]">{lead.timestamp}</td>
                      <td className="py-3 pr-1 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                          lead.status === 'confirmed' 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-750' 
                            : 'bg-amber-50 border-amber-100 text-amber-750'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Stock level alerts & Quick templates */}
        <div className="space-y-6">
          
          {/* Inventory warning room */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Algeria Warehouse Alerts</h3>
                <p className="text-[10px] text-slate-400">Prizes nearing critical stock levels</p>
              </div>
            </div>

            <div className="space-y-3">
              {lowStockPrizes.map((p) => (
                <div key={p.id} className="bg-amber-50/30 border border-amber-100 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{p.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono capitalize">{p.category} reward</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-600 block">{p.availableStock} left</span>
                    <span className="text-[9px] text-slate-400">Total: {p.totalStock}</span>
                  </div>
                </div>
              ))}

              {lowStockPrizes.length === 0 && (
                <div className="text-center py-4 bg-slate-50/60 border border-slate-100 rounded-xl text-[11px] text-slate-400 leading-normal">
                  All campaign prizes have sufficient safety margins.
                </div>
              )}

              <button 
                onClick={() => onNavigate('inventory')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-11 mt-2"
              >
                Access Inventory Room
              </button>
            </div>
          </div>

          {/* Quick Stats Dialect Translation Check */}
          <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm space-y-3.5">
            <h3 className="font-bold text-sm text-slate-800">Algerian Context Optimization</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              DZENGAGE automatically formats campaign copy for native Darija dialects. Ensure you include standard translation files on step-1 setup to match native consumer phrases.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-[11px] text-slate-700 leading-normal font-mono">
              <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-1">Standard Greeting Translation</span>
              <span>"سجل واربح هدايا فورية قيمة!"</span>
              <span className="text-slate-400 block text-[9px] uppercase tracking-wider mt-2 mb-1">Darija Variant</span>
              <span>"أدخل معلوماتك واربح كادو مع جيل الجزائر!"</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
