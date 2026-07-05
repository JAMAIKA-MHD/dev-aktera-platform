import React, { useState } from 'react';
import { Campaign } from '../types';
import { 
  Plus, Search, Play, Pause, RotateCcw, BarChart3, 
  Trash2, Filter, AlertCircle, Calendar, Eye 
} from 'lucide-react';
import { motion } from 'motion/react';

interface CampaignsListProps {
  campaigns: Campaign[];
  onSelectCampaign: (id: string) => void;
  onRelaunch: (camp: Campaign) => void;
  onToggleStatus: (id: string) => void;
  onArchive: (id: string) => void;
  onOpenWizard: () => void;
}

export const CampaignsList: React.FC<CampaignsListProps> = ({
  campaigns,
  onSelectCampaign,
  onRelaunch,
  onToggleStatus,
  onArchive,
  onOpenWizard
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'draft' | 'archived'>('all');

  // Filter logic
  const filteredCampaigns = campaigns.filter(camp => {
    const matchesSearch = camp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          camp.arabicName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || camp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'paused':
        return 'bg-amber-50 border-amber-100 text-amber-700';
      case 'draft':
        return 'bg-blue-50 border-blue-100 text-blue-700';
      case 'archived':
        return 'bg-slate-50 border-slate-100 text-slate-500';
    }
  };

  return (
    <div id="campaigns-list-root" className="space-y-6 text-slate-855">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Campaign Radios & Portals</h2>
          <p className="text-slate-500 text-xs mt-0.5">Configure active wheels, lucky drawers, and quiz pipelines.</p>
        </div>
        <button
          onClick={onOpenWizard}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer min-h-12 text-xs"
        >
          <Plus className="w-5 h-5" />
          <span>Launch Campaign Wizard</span>
        </button>
      </div>

      {/* Filter and search block */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Status Filters */}
        <div className="flex gap-1 bg-white border border-slate-200 p-1 rounded-xl w-full md:w-auto overflow-x-auto select-none">
          {([
            { id: 'all', label: 'All Portals' },
            { id: 'active', label: 'Live' },
            { id: 'paused', label: 'Paused' },
            { id: 'draft', label: 'Draft' },
            { id: 'archived', label: 'Archived' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-150 ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 hover:border-slate-400 focus:border-indigo-500 rounded-xl pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 transition-all duration-200 min-h-[44px] focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>

      </div>

      {/* Main Campaign Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {filteredCampaigns.map((camp) => (
          <motion.div
            key={camp.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-3xl p-5 hover:border-slate-400 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow"
          >
            {/* Top header block */}
            <div>
              <div className="flex justify-between items-start gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${getStatusColor(camp.status)}`}>
                  {camp.status}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Type: <strong className="text-slate-600 capitalize font-sans">{camp.type.replace('_', ' ')}</strong>
                </span>
              </div>

              <h3 className="font-extrabold text-base text-slate-800 leading-tight mt-1">
                {camp.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1" dir="auto">
                {camp.arabicName}
              </p>

              {/* Campaign Lineage Indicator */}
              {camp.parentCampaignId && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[10px] text-indigo-600 font-mono">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Relaunched from past campaign</span>
                </div>
              )}
            </div>

            {/* Middle Quick Stats Block */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/60 rounded-2xl p-3 my-4">
              <div className="text-center border-r border-slate-200/80">
                <p className="text-sm font-extrabold text-slate-800">{camp.participantsCount}</p>
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Entries</p>
              </div>
              <div className="text-center border-r border-slate-200/80">
                <p className="text-sm font-extrabold text-indigo-600">{camp.rewardsClaimed}</p>
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Prizes Won</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-extrabold text-slate-800">{camp.winProbability}%</p>
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Win Prob</p>
              </div>
            </div>

            {/* Date line & Control bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-t border-slate-100 pt-4 mt-1">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{camp.startDate} to {camp.endDate}</span>
              </div>

              {/* Action buttons list */}
              <div className="flex items-center gap-2 justify-end">
                {/* View Details/Stats */}
                <button
                  onClick={() => onSelectCampaign(camp.id)}
                  title="View analytics details"
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 cursor-pointer transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Pause/Resume switch */}
                {camp.status !== 'archived' && camp.status !== 'draft' && (
                  <button
                    onClick={() => onToggleStatus(camp.id)}
                    title={camp.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                      camp.status === 'active'
                        ? 'bg-amber-50 border-amber-250 text-amber-700 hover:bg-amber-100'
                        : 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {camp.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                )}

                {/* Relaunch */}
                <button
                  onClick={() => onRelaunch(camp)}
                  title="Relaunch duplicate campaign"
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-600 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Delete/Archive */}
                {camp.status !== 'archived' && (
                  <button
                    onClick={() => onArchive(camp.id)}
                    title="Archive campaign"
                    className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-600 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

          </motion.div>
        ))}

        {filteredCampaigns.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white border border-slate-200 rounded-3xl p-6">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-base font-bold text-slate-700">No campaigns found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Refine your filter options or trigger a new campaign via our interactive multi-step configuration wizard.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
