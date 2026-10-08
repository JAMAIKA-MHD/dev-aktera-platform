import React from "react";
import { Eye, ReceiptText, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsSummary } from "../../hooks/useAnalytics";
import { ChartPanel, StatCard, useChartTheme } from "./CampaignAnalyticsCharts";

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

/**
 * The combined view of every campaign. Every number comes from the
 * `get_campaign_analytics_v2` RPC payload; nothing is drawn without data.
 */
export const AllCampaignsOverview: React.FC<{
  analytics: AnalyticsSummary;
}> = ({ analytics }) => {
  const chart = useChartTheme();

  if (analytics.total_entries === 0 && analytics.total_impressions === 0) {
    return (
      <div className="glass-panel mb-4 rounded-xl px-6 py-14 text-center">
        <h2 className="text-base font-semibold text-brand-text">
          No analytics yet
        </h2>
        <p className="mt-1 text-xs text-brand-text-muted">
          Nobody has opened or played a campaign so far. Numbers appear here
          after the first visit.
        </p>
      </div>
    );
  }

  // One point per day, oldest first (the RPC returns the last 14 days).
  const days = analytics.daily_distribution.map((day) => ({
    date: day.date,
    entries: day.entries,
    winners: day.winners,
    // No entries that day: no win rate, rather than a misleading 0 %.
    winRate:
      day.entries > 0
        ? Number(((day.winners / day.entries) * 100).toFixed(1))
        : null,
  }));
  const hasEntries = days.some((day) => day.entries > 0);

  const lastWeek = sum(days.slice(-7).map((day) => day.entries));
  const previousWeek = sum(days.slice(-14, -7).map((day) => day.entries));
  const growth =
    previousWeek > 0
      ? Math.round(((lastWeek - previousWeek) / previousWeek) * 100)
      : null;

  const axisTick = { fill: chart.axis, fontSize: 11 };

  return (
    <div className="mb-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total impressions"
          value={analytics.total_impressions.toLocaleString()}
          caption="Visits to your campaign pages"
          icon={<Eye className="h-4 w-4" />}
        />
        <StatCard
          title="Total entries"
          value={analytics.total_entries.toLocaleString()}
          caption={`${analytics.total_wins.toLocaleString()} winners · ${analytics.win_rate}% win rate`}
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <StatCard
          title="Conversion rate"
          value={`${analytics.form_completion_rate.toFixed(1)}%`}
          caption="Entries per visitor who played"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <ChartPanel
          title="Entries & winners"
          subtitle="Participations per day over the last 14 days, all campaigns."
          isEmpty={!hasEntries}
          emptyMessage="No participations in the last 14 days."
          className="col-span-12 xl:col-span-8"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={days}
                margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={chart.grid} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  allowDecimals={false}
                />
                <Tooltip {...chart.tooltip} cursor={{ fill: chart.grid }} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                />
                <Bar
                  dataKey="entries"
                  name="Entries"
                  fill={chart.series[0]}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="winners"
                  name="Winners"
                  fill={chart.series[1]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Win rate"
          subtitle="Share of each day's entries that won a prize."
          isEmpty={!hasEntries}
          emptyMessage="No participations in the last 14 days."
          className="col-span-12 xl:col-span-4"
        >
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={days}
                margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={chart.grid} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip {...chart.tooltip} />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  name="Win rate"
                  unit="%"
                  stroke={chart.series[0]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-brand-border/30 pt-3">
            <div>
              <dd className="text-xl font-bold text-brand-text">
                {lastWeek.toLocaleString()}
              </dd>
              <dt className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-text-muted">
                Entries, last 7 days
              </dt>
            </div>
            <div>
              <dd className="text-xl font-bold text-brand-text">
                {previousWeek.toLocaleString()}
              </dd>
              <dt className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-text-muted">
                Previous 7 days
              </dt>
            </div>
            <div>
              <dd
                className={`text-xl font-bold ${
                  growth === null
                    ? "text-brand-text-muted"
                    : growth >= 0
                      ? "text-emerald-500"
                      : "text-red-500"
                }`}
              >
                {growth === null ? "—" : `${growth > 0 ? "+" : ""}${growth}%`}
              </dd>
              <dt className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand-text-muted">
                Growth
              </dt>
            </div>
          </dl>
        </ChartPanel>
      </div>
    </div>
  );
};
