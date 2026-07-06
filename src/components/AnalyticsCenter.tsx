import React, { useMemo, useState } from 'react';
import { Award, BarChart3, Clock, Download, MapPin, Sparkles, TrendingUp, Users } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';

const HOURLY_PREVIEW = [
  { hour: "00:00 - 04:00 (S'hour)", count: 32, label: 'Night pulse' },
  { hour: '04:00 - 08:00 (Fajr)', count: 8, label: 'Calm morning' },
  { hour: '08:00 - 12:00', count: 18, label: 'Work hours' },
  { hour: '12:00 - 16:00', count: 24, label: 'Midday traffic' },
  { hour: '16:00 - 20:00 (Iftar)', count: 15, label: 'Sunset prep' },
  { hour: '20:00 - 00:00 (Tarawih)', count: 48, label: 'Night rush' },
];

const REGION_PREVIEW = [
  { name: 'Algiers (الجزائر)', percentage: 42, count: '1,900' },
  { name: 'Oran (وهران)', percentage: 22, count: '1,000' },
  { name: 'Constantine (قسنطينة)', percentage: 18, count: '810' },
  { name: 'Annaba (عنابة)', percentage: 10, count: '450' },
  { name: 'Ouargla / Ghardaia (الجنوب)', percentage: 8, count: '360' },
];

export const AnalyticsCenter: React.FC = () => {
  const { analytics, loading, error } = useAnalytics();
  const [selectedCampId, setSelectedCampId] = useState<string>('all');

  const selectedCampaign = useMemo(
    () => analytics?.by_campaign.find((campaign) => campaign.campaign_id === selectedCampId) ?? null,
    [analytics, selectedCampId],
  );

  const filteredStats = useMemo(() => {
    if (!analytics) {
      return { totalEntries: 0, totalWins: 0, winPercentage: '0.0', totalPrizes: 0, activeCampaigns: 0 };
    }

    if (selectedCampaign) {
      return {
        totalEntries: selectedCampaign.total_entries,
        totalWins: selectedCampaign.total_winners,
        winPercentage: (selectedCampaign.win_rate * 100).toFixed(1),
        totalPrizes: selectedCampaign.total_prizes,
        activeCampaigns: 1,
      };
    }

    return {
      totalEntries: analytics.total_entries,
      totalWins: analytics.total_winners,
      winPercentage: (analytics.win_rate * 100).toFixed(1),
      totalPrizes: analytics.by_campaign.reduce((sum, campaign) => sum + campaign.total_prizes, 0),
      activeCampaigns: analytics.active_campaigns,
    };
  }, [analytics, selectedCampaign]);

  const handleExportCSV = () => {
    if (!analytics) return;

    const rows = selectedCampaign ? [selectedCampaign] : analytics.by_campaign;
    const csvContent =
      'data:text/csv;charset=utf-8,Campaign,Entries,Winners,Win_Rate,Allocated_Prizes\n' +
      rows
        .map(
          (row) =>
            `"${row.campaign_name}",${row.total_entries},${row.total_winners},${(row.win_rate * 100).toFixed(1)}%,${row.total_prizes}`,
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dzengage_analytics_export_${selectedCampId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        {error || 'Analytics unavailable right now.'}
      </div>
    );
  }

  return (
    <div id="analytics-center-root" className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Campaign Analytics Desk</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Live totals now come from uncapped organization-wide aggregation instead of the 500-row entries sample.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCampId}
            onChange={(e) => setSelectedCampId(e.target.value)}
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl px-4 py-2 text-xs text-slate-800 focus:outline-none min-h-11 shadow-sm cursor-pointer font-sans"
          >
            <option value="all">All Campaigns Combined</option>
            {analytics.by_campaign.map((campaign) => (
              <option key={campaign.campaign_id} value={campaign.campaign_id}>
                {campaign.campaign_name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-11 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Summary</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[
          { title: 'Entries', value: filteredStats.totalEntries, desc: 'All recorded participations', icon: Users, color: 'text-indigo-600' },
          { title: 'Winners', value: filteredStats.totalWins, desc: 'Winning entries confirmed', icon: Award, color: 'text-emerald-600' },
          { title: 'Win rate', value: `${filteredStats.winPercentage}%`, desc: 'Winner-to-entry conversion', icon: TrendingUp, color: 'text-amber-600' },
          { title: 'Allocated prizes', value: filteredStats.totalPrizes, desc: selectedCampaign ? 'Reserved for this campaign' : `${filteredStats.activeCampaigns} active campaigns live`, icon: BarChart3, color: 'text-sky-600' },
        ].map((stat) => (
          <div key={stat.title} className="bg-white border border-slate-200 shadow-sm rounded-[24px] p-5">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">{stat.title}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <h4 className="text-3xl font-extrabold mt-3 mb-1 text-slate-900">{stat.value}</h4>
            <p className="text-[11px] text-slate-500">{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-850">Campaign performance breakdown</h3>
            <p className="text-[10px] text-slate-500">Organization-wide live totals by campaign.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-150 text-[10px] font-mono text-slate-400 uppercase">
                <th className="pb-3 pl-1 text-left font-semibold">Campaign</th>
                <th className="pb-3 text-center font-semibold">Entries</th>
                <th className="pb-3 text-center font-semibold">Winners</th>
                <th className="pb-3 text-center font-semibold">Win rate</th>
                <th className="pb-3 text-right font-semibold">Allocated prizes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {analytics.by_campaign.map((campaign) => (
                <tr key={campaign.campaign_id} className="hover:bg-slate-50/70 transition-all duration-150">
                  <td className="py-3.5 pl-1">
                    <p className="font-bold text-slate-800">{campaign.campaign_name}</p>
                  </td>
                  <td className="py-3.5 text-center font-mono text-slate-700">{campaign.total_entries}</td>
                  <td className="py-3.5 text-center font-mono text-emerald-700">{campaign.total_winners}</td>
                  <td className="py-3.5 text-center font-mono text-amber-700">{(campaign.win_rate * 100).toFixed(1)}%</td>
                  <td className="py-3.5 text-right font-mono text-slate-700">{campaign.total_prizes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-850">Algerian Hour-of-Day Footprint</h3>
              <p className="text-[10px] text-slate-500">Preview retained until trustworthy hourly aggregation is wired to the backend.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {HOURLY_PREVIEW.map((entry) => {
              const maxValue = Math.max(...HOURLY_PREVIEW.map((item) => item.count));
              const widthPct = (entry.count / maxValue) * 100;
              return (
                <div key={entry.hour} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-600">{entry.hour}</span>
                    <span className="text-indigo-600 font-bold">{entry.count} entries ({entry.label})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/50">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-850">Algerian Regional Split (Wilaya)</h3>
              <p className="text-[10px] text-slate-500">Main provinces capturing promotional interactions in the preserved preview layer.</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {REGION_PREVIEW.map((region) => (
              <div key={region.name} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">{region.name}</span>
                  <span className="text-slate-500 font-mono text-[11px]">{region.percentage}% ({region.count} users)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${region.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-[28px] p-5 shadow-sm flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="text-xs font-bold text-indigo-900">Analytics fidelity upgraded</span>
          <p className="text-[11px] text-indigo-900 leading-relaxed mt-0.5 font-sans">
            This dashboard now uses uncapped organization-level aggregation for entry, winner, and prize totals. The hourly and regional charts remain preview guidance until those dimensions are added to the backend event model.
          </p>
        </div>
      </div>
    </div>
  );
};
