import { useMemo, useState } from 'react';
import { Award, Clock, Download, MapPin, Sparkles, TrendingUp, Users } from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';

const HOURLY_PREVIEW = [
  { hour: "00:00 - 04:00 (S'hour)", count: 32, label: 'Night pulse' },
  { hour: '04:00 - 08:00 (Fajr)', count: 8, label: 'Calm morning' },
  { hour: '08:00 - 12:00', count: 18, label: 'Work hours' },
  { hour: '12:00 - 16:00', count: 24, label: 'Midday traffic' },
  { hour: '16:00 - 20:00 (Iftar)', count: 15, label: 'Sunset prep' },
  { hour: '20:00 - 00:00 (Tarawih)', count: 48, label: 'Night rush' },
];

const REGION_PREVIEW = [
  { name: 'Algiers', percentage: 42, count: '1,900' },
  { name: 'Oran', percentage: 22, count: '1,000' },
  { name: 'Constantine', percentage: 18, count: '810' },
  { name: 'Annaba', percentage: 10, count: '450' },
  { name: 'Ouargla / Ghardaia', percentage: 8, count: '360' },
];

export default function Analytics() {
  const { analytics, loading, error } = useAnalytics();
  const [selectedCampId, setSelectedCampId] = useState<string>('all');

  const selectedCampaign = useMemo(
    () => analytics?.by_campaign.find((campaign) => campaign.campaign_id === selectedCampId) ?? null,
    [analytics, selectedCampId],
  );

  const filteredStats = useMemo(() => {
    if (!analytics) {
      return { totalEntries: 0, totalWins: 0, winPercentage: '0.0' };
    }

    if (selectedCampaign) {
      return {
        totalEntries: selectedCampaign.total_entries,
        totalWins: selectedCampaign.total_winners,
        winPercentage: (selectedCampaign.win_rate * 100).toFixed(1),
      };
    }

    return {
      totalEntries: analytics.total_entries,
      totalWins: analytics.total_winners,
      winPercentage: (analytics.win_rate * 100).toFixed(1),
    };
  }, [analytics, selectedCampaign]);

  const handleExportCSV = () => {
    if (!analytics) return;

    const rows = selectedCampaign ? [selectedCampaign] : analytics.by_campaign;
    const csvContent =
      'data:text/csv;charset=utf-8,Campaign,Entries,Winners,Win_Rate,Prizes\n' +
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
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">Error: {error || 'Analytics unavailable'}</div>;
  }

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Campaign Analytics Desk</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Understand peak traffic hour spikes, regional participation, and winner rates.
          </p>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          <select
            value={selectedCampId}
            onChange={(event) => setSelectedCampId(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-indigo-500"
          >
            <option value="all">All Campaigns Combined</option>
            {analytics.by_campaign.map((campaign) => (
              <option key={campaign.campaign_id} value={campaign.campaign_id}>
                {campaign.campaign_name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            className="touch-target inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-200"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Leads</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {[
          {
            title: 'Campaign Sample Entries',
            value: filteredStats.totalEntries,
            desc: 'Zero-party consumer forms submitted',
            icon: Users,
            color: 'text-indigo-600',
          },
          {
            title: 'Calculated Wins',
            value: filteredStats.totalWins,
            desc: 'Vouchers & physical items claimed',
            icon: Award,
            color: 'text-emerald-600',
          },
          {
            title: 'Win-to-Loss Ratio',
            value: `${filteredStats.winPercentage}%`,
            desc: 'Optimized reward conversions',
            icon: TrendingUp,
            color: 'text-amber-600',
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.title}</span>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <h4 className="mt-3 text-3xl font-extrabold text-slate-900">{stat.value}</h4>
              <p className="mt-1 text-[11px] text-slate-500">{stat.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Algerian Hour-of-Day Footprint</h3>
              <p className="text-[10px] text-slate-500">
                Preview retained until trustworthy hourly aggregation is wired to the backend.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {HOURLY_PREVIEW.map((entry) => {
              const maxValue = Math.max(...HOURLY_PREVIEW.map((item) => item.count));
              const widthPct = (entry.count / maxValue) * 100;

              return (
                <div key={entry.hour} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-mono text-slate-600">{entry.hour}</span>
                    <span className="font-bold text-indigo-600">
                      {entry.count} entries ({entry.label})
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full border border-slate-200/50 bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Algerian Regional Split (Wilaya)</h3>
              <p className="text-[10px] text-slate-500">
                Main provinces capturing promotional interactions in the preserved preview layer.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {REGION_PREVIEW.map((region) => (
              <div key={region.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{region.name}</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {region.percentage}% ({region.count} users)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${region.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-[28px] border border-indigo-100 bg-indigo-50 p-5 shadow-sm">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
        <div>
          <span className="text-xs font-bold text-indigo-900">Algerian Ad-Spending Intelligence Tip</span>
          <p className="mt-0.5 text-[11px] leading-relaxed text-indigo-950">
            Tarawih and S&apos;hour hours represent the heaviest interaction windows in this preserved preview layer. Use this surface as visual direction now; the live hourly optimizer will come after the backend aggregation milestone.
          </p>
        </div>
      </div>
    </div>
  );
}
