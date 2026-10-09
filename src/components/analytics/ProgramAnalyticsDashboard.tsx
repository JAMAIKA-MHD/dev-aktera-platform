import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Gift,
  ReceiptText,
  Repeat,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
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
import { useAuth } from "../../contexts/AuthContext";
import { useProgramAnalytics } from "../../hooks/useProgramAnalytics";
import { formatRate } from "../../lib/campaignAnalyticsTransforms";
import { PLAN_ALLOWANCES } from "../../lib/planAllowances";
import {
  buildDecayRows,
  PROGRAM_PERIODS,
  programPeriodStart,
  usagePercent,
  type ProgramPeriodKey,
} from "../../lib/programAnalyticsTransforms";
import {
  ProgramAnalytics,
  ProgramCampaignStatusCounts,
  ProgramStockRisk,
} from "../../types";
import { gameMeta } from "../campaigns/campaignMeta";
import { AlgeriaWilayaMap } from "./AlgeriaWilayaMap";
import {
  ChartPanel,
  OsDonutChart,
  StatCard,
  TimeSegmentationChart,
  useChartTheme,
} from "./CampaignAnalyticsCharts";

const MAX_AUDIENCE_BARS = 8;

const shorten = (name: string, max: number) =>
  name.length > max ? `${name.slice(0, max - 1)}…` : name;

const STATUS_TILES: {
  key: Exclude<keyof ProgramCampaignStatusCounts, "total">;
  label: string;
  dot: string;
}[] = [
  { key: "active", label: "Active", dot: "bg-emerald-500" },
  { key: "paused", label: "Paused", dot: "bg-amber-500" },
  { key: "draft", label: "Draft", dot: "bg-blue-500" },
  { key: "ended", label: "Ended", dot: "bg-violet-500" },
  { key: "archived", label: "Archived", dot: "bg-slate-400" },
];

const RISK_META: Record<
  ProgramStockRisk["risk"],
  { label: string; icon: LucideIcon; badge: string }
> = {
  out: {
    label: "Out of stock",
    icon: XCircle,
    badge:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/70 dark:text-red-300",
  },
  critical: {
    label: "Critical",
    icon: AlertTriangle,
    badge:
      "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-950/70 dark:text-orange-300",
  },
  warning: {
    label: "Low",
    icon: AlertCircle,
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-300",
  },
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h2 className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
    {children}
  </h2>
);

const headCell =
  "pb-2 px-2 font-medium uppercase text-[10px] tracking-wider text-brand-text-muted";

interface SectionProps {
  analytics: ProgramAnalytics;
}

const CampaignStatusPanel: React.FC<SectionProps> = ({ analytics }) => {
  const counts = analytics.campaign_status;
  // "Ended" only exists on older campaigns: shown when there is one.
  const tiles = STATUS_TILES.filter(
    (tile) => tile.key !== "ended" || counts.ended > 0,
  );
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] uppercase font-semibold tracking-wider text-brand-text-muted">
          Campaigns by state
        </h3>
        <span className="text-[11px] text-brand-text-muted">
          {counts.total.toLocaleString()} in total · as of now
        </span>
      </div>
      <dl
        className="mt-3 grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`,
        }}
      >
        {tiles.map((tile) => (
          <div key={tile.key}>
            <dd className="text-2xl font-bold text-brand-text">
              {counts[tile.key].toLocaleString()}
            </dd>
            <dt className="mt-0.5 flex items-center gap-1.5 text-[11px] text-brand-text-muted">
              <span className={`h-2 w-2 rounded-full ${tile.dot}`} />
              {tile.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
};

const Leaderboard: React.FC<
  SectionProps & { onSelectCampaign: (campaignId: string) => void }
> = ({ analytics, onSelectCampaign }) => {
  const chart = useChartTheme();
  const rows = analytics.leaderboard;
  const maxEntries = rows[0]?.entries ?? 0;

  return (
    <ChartPanel
      title="Campaign leaderboard"
      subtitle="Entries, completion rate and rewards won per campaign. Select a campaign to open it."
      isEmpty={rows.length === 0}
      emptyMessage="No campaigns yet."
      className="h-full"
    >
      <div className="max-h-96 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-brand-border/50">
              <th className={`${headCell} w-8`}>#</th>
              <th className={headCell}>Campaign</th>
              <th className={`${headCell} w-2/5`}>Entries</th>
              <th className={`${headCell} text-right`}>Completion</th>
              <th className={`${headCell} text-right`}>Rewards</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/30">
            {rows.map((row, index) => (
              <tr
                key={row.campaign_id}
                className="cursor-pointer transition-colors hover:bg-card-bg-subtle"
                onClick={() => onSelectCampaign(row.campaign_id)}
              >
                <td className="py-2.5 px-2 text-brand-text-muted">
                  {index + 1}
                </td>
                <td className="py-2.5 px-2">
                  <div
                    className="font-semibold text-brand-text"
                    title={row.campaign_name}
                    dir="auto"
                  >
                    {shorten(row.campaign_name, 40)}
                  </div>
                  <div className="text-[10px] capitalize text-brand-text-muted">
                    {gameMeta(row.game_type).label} · {row.status}
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-bg-subtle">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxEntries > 0 ? (row.entries / maxEntries) * 100 : 0}%`,
                          backgroundColor: chart.series[0],
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-semibold text-brand-text">
                      {row.entries.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td
                  className="py-2.5 px-2 text-right text-brand-text"
                  title={
                    row.completion_rate === null
                      ? "No visitor sessions tracked in this period"
                      : `${row.completed_impressions.toLocaleString()} of ${row.impressions.toLocaleString()} visitors completed the form`
                  }
                >
                  {formatRate(row.completion_rate)}
                </td>
                <td className="py-2.5 px-2 text-right text-brand-text">
                  {row.rewards.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartPanel>
  );
};

const MechanicsPanel: React.FC<SectionProps> = ({ analytics }) => (
  <ChartPanel
    title="Performance by mechanic"
    subtitle="The same metrics, grouped by game."
    isEmpty={analytics.mechanics.length === 0}
    emptyMessage="No campaigns yet."
    className="h-full"
  >
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-b border-brand-border/50">
          <th className={headCell}>Mechanic</th>
          <th className={`${headCell} text-right`}>Entries</th>
          <th className={`${headCell} text-right`}>Completion</th>
          <th className={`${headCell} text-right`}>Rewards</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-border/30">
        {analytics.mechanics.map((row) => {
          const game = gameMeta(row.game_type);
          const Icon = game.icon;
          return (
            <tr key={row.game_type}>
              <td className="py-2.5 px-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${game.tile}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="font-semibold text-brand-text">
                      {game.label}
                    </div>
                    <div className="text-[10px] text-brand-text-muted">
                      {row.campaigns}{" "}
                      {row.campaigns === 1 ? "campaign" : "campaigns"}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-2.5 px-2 text-right font-semibold text-brand-text">
                {row.entries.toLocaleString()}
              </td>
              <td className="py-2.5 px-2 text-right text-brand-text">
                {formatRate(row.completion_rate)}
              </td>
              <td className="py-2.5 px-2 text-right text-brand-text">
                {row.rewards.toLocaleString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </ChartPanel>
);

const DecayCurveChart: React.FC<SectionProps> = ({ analytics }) => {
  const chart = useChartTheme();
  const series = analytics.decay_curve;
  const rows = useMemo(() => buildDecayRows(series), [series]);
  const axisTick = { fill: chart.axis, fontSize: 11 };

  return (
    <ChartPanel
      title="Campaign decay curve"
      subtitle="Entries per day since launch, campaigns overlaid. Day 1 is the day of each campaign's first entry."
      isEmpty={series.length === 0}
      emptyMessage="No participations in this period."
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke={chart.grid} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              minTickGap={24}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              allowDecimals={false}
            />
            <Tooltip
              {...chart.tooltip}
              cursor={{ stroke: chart.grid }}
              labelFormatter={(day) => `Day ${day} since launch`}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-[11px] text-brand-text-muted">
                  {shorten(String(value), 32)}
                </span>
              )}
            />
            {series.map((s, index) => (
              <Line
                key={s.campaign_id}
                type="monotone"
                dataKey={s.campaign_id}
                name={s.campaign_name}
                stroke={chart.series[index]}
                strokeWidth={2}
                dot={s.points.length === 1 ? { r: 4 } : false}
                activeDot={{ r: 5, stroke: chart.surface, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
};

const AudienceChart: React.FC<SectionProps> = ({ analytics }) => {
  const chart = useChartTheme();
  const rows = analytics.leaderboard
    .filter((row) => row.new_participants + row.returning_participants > 0)
    .slice(0, MAX_AUDIENCE_BARS)
    .map((row) => ({
      name: row.campaign_name,
      new: row.new_participants,
      returning: row.returning_participants,
    }));
  const axisTick = { fill: chart.axis, fontSize: 11 };

  return (
    <ChartPanel
      title="New vs. returning participants"
      subtitle="Per campaign: participants first seen in it, and participants already seen in an earlier campaign."
      isEmpty={rows.length === 0}
      emptyMessage="No identified participants in this period."
      className="h-full"
    >
      <div className="w-full" style={{ height: 64 + rows.length * 36 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={chart.grid} />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={220}
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              tickFormatter={(name: string) => shorten(name, 44)}
            />
            <Tooltip
              {...chart.tooltip}
              cursor={{
                fill: chart.isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
              }}
            />
            <Legend
              verticalAlign="top"
              height={32}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-[11px] text-brand-text-muted">
                  {value}
                </span>
              )}
            />
            <Bar
              dataKey="new"
              name="New"
              stackId="audience"
              fill={chart.series[0]}
              stroke={chart.surface}
              strokeWidth={2}
              maxBarSize={18}
            />
            <Bar
              dataKey="returning"
              name="Returning"
              stackId="audience"
              fill={chart.series[1]}
              stroke={chart.surface}
              strokeWidth={2}
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
};

const StockRiskList: React.FC<SectionProps> = ({ analytics }) => {
  const tracked = analytics.stock_templates_tracked;
  return (
    <ChartPanel
      title="Stock-risk list"
      subtitle="Prize templates running low, or burning fast enough to run out within two weeks."
      isEmpty={analytics.stock_risk.length === 0}
      emptyMessage={
        tracked === 0
          ? "No prize template has stock yet."
          : `No stock at risk across ${tracked} prize ${tracked === 1 ? "template" : "templates"}.`
      }
      className="h-full"
    >
      <ul className="divide-y divide-brand-border/30">
        {analytics.stock_risk.map((item) => {
          const risk = RISK_META[item.risk];
          const Icon = risk.icon;
          return (
            <li
              key={item.template_id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
            >
              <div className="min-w-0">
                <div
                  className="truncate text-xs font-semibold text-brand-text"
                  dir="auto"
                >
                  {item.name}
                </div>
                <div className="text-[11px] text-brand-text-muted">
                  {item.remaining.toLocaleString()} of{" "}
                  {item.total_stock.toLocaleString()} left ·{" "}
                  {item.burn_rate_percentage}% burned ·{" "}
                  {item.wins_per_day > 0
                    ? `${item.wins_per_day} won per day`
                    : "none won in the last 7 days"}
                  {item.days_left !== null &&
                    item.remaining > 0 &&
                    ` · about ${Math.max(1, Math.round(item.days_left))} ${Math.round(item.days_left) <= 1 ? "day" : "days"} left`}
                </div>
              </div>
              <span
                className={`flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${risk.badge}`}
              >
                <Icon className="h-3 w-3" />
                {risk.label}
              </span>
            </li>
          );
        })}
      </ul>
    </ChartPanel>
  );
};

const UsageMeter: React.FC<{
  label: string;
  used: number;
  limit: number | null;
}> = ({ label, used, limit }) => {
  const chart = useChartTheme();
  const percent = usagePercent(used, limit);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-brand-text">{label}</span>
        <span className="text-brand-text-muted">
          <span className="font-semibold text-brand-text">
            {used.toLocaleString()}
          </span>{" "}
          / {limit === null ? "Unlimited" : limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-card-bg-subtle">
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent ?? 0}%`,
            backgroundColor: chart.series[0],
          }}
        />
      </div>
      <div className="mt-1 text-[11px] text-brand-text-muted">
        {percent === null ? "No limit on this plan" : `${percent}% used`}
      </div>
    </div>
  );
};

const PlanUsagePanel: React.FC<SectionProps> = ({ analytics }) => {
  const usage = analytics.plan_usage;
  const allowance = PLAN_ALLOWANCES[usage.plan] ?? PLAN_ALLOWANCES.free;
  return (
    <ChartPanel
      title="Plan usage vs. limits"
      subtitle={`${allowance.label} plan allowance.`}
      actions={
        <span
          className="rounded-full border border-brand-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted"
          title="Shown for information: plan limits are not enforced yet."
        >
          Preview
        </span>
      }
      className="h-full"
    >
      <div className="space-y-5">
        <UsageMeter
          label="Entries this month"
          used={usage.entries_this_month}
          limit={allowance.entriesPerMonth}
        />
        <UsageMeter
          label="Active campaigns"
          used={usage.active_campaigns}
          limit={allowance.activeCampaigns}
        />
        <p className="text-[11px] text-brand-text-muted">
          Shown for information: plan limits are not enforced yet.
        </p>
      </div>
    </ChartPanel>
  );
};

interface ProgramAnalyticsDashboardProps {
  onSelectCampaign: (campaignId: string) => void;
}

/**
 * The combined view of every campaign of the organization. Every number comes from the
 * `get_program_analytics` RPC; the browser only lays them out.
 */
export const ProgramAnalyticsDashboard: React.FC<
  ProgramAnalyticsDashboardProps
> = ({ onSelectCampaign }) => {
  const { organization } = useAuth();
  const [periodKey, setPeriodKey] = useState<ProgramPeriodKey>("all");
  const from = useMemo(() => programPeriodStart(periodKey), [periodKey]);
  const { analytics, loading, refreshing, error } = useProgramAnalytics(
    organization?.id ?? null,
    from,
  );

  if (loading && !analytics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="glass-panel rounded-2xl p-4 text-red-400 font-medium">
        {error || "Analytics unavailable right now."}
      </div>
    );
  }

  const { totals, audience } = analytics;
  const participations =
    audience.new_participants + audience.returning_participants;

  return (
    <div
      id="program-analytics-dashboard"
      className={`mb-4 space-y-4 transition-opacity ${refreshing ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle>Program totals</SectionTitle>
        <div
          role="group"
          aria-label="Period"
          className="flex items-center glass-panel p-0.5 rounded-xl text-[11px]"
        >
          {PROGRAM_PERIODS.map((period) => (
            <button
              key={period.key}
              type="button"
              aria-pressed={periodKey === period.key}
              onClick={() => setPeriodKey(period.key)}
              className={`px-2.5 py-0.5 font-semibold rounded-full cursor-pointer transition-colors ${
                periodKey === period.key
                  ? "bg-brand-accent/20 text-brand-accent shadow-sm"
                  : "text-brand-text-muted hover:text-brand-text"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title="Total entries"
          value={totals.entries.toLocaleString()}
          caption="Participations across all campaigns"
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <StatCard
          title="Prizes distributed"
          value={totals.prizes_distributed.toLocaleString()}
          caption="Winning entries across all campaigns"
          icon={<Gift className="h-4 w-4" />}
        />
        <StatCard
          title="Unique audience"
          value={audience.unique_audience.toLocaleString()}
          caption="Distinct participants, by phone number"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Repeat participation"
          value={formatRate(audience.repeat_participation_rate)}
          caption={
            audience.repeat_participation_rate === null
              ? "No identified participants yet"
              : `${audience.repeat_participants.toLocaleString()} played 2 or more campaigns`
          }
          icon={<Repeat className="h-4 w-4" />}
        />
      </div>

      <CampaignStatusPanel analytics={analytics} />

      <SectionTitle>Comparison</SectionTitle>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-7">
          <Leaderboard
            analytics={analytics}
            onSelectCampaign={onSelectCampaign}
          />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <MechanicsPanel analytics={analytics} />
        </div>
      </div>
      <DecayCurveChart analytics={analytics} />

      <SectionTitle>Audience asset</SectionTitle>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8">
          <AudienceChart analytics={analytics} />
        </div>
        <div className="col-span-12 grid grid-cols-2 gap-4 xl:col-span-4 xl:grid-cols-1">
          <StatCard
            title="New participants"
            value={audience.new_participants.toLocaleString()}
            caption={
              participations > 0
                ? `${((audience.new_participants / participations) * 100).toFixed(1)}% of campaign participations`
                : "First seen in a campaign of this period"
            }
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Returning participants"
            value={audience.returning_participants.toLocaleString()}
            caption={
              participations > 0
                ? `${((audience.returning_participants / participations) * 100).toFixed(1)}% of campaign participations`
                : "Already seen in an earlier campaign"
            }
            icon={<Repeat className="h-4 w-4" />}
          />
        </div>
      </div>

      <SectionTitle>Control</SectionTitle>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-7">
          <StockRiskList analytics={analytics} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <PlanUsagePanel analytics={analytics} />
        </div>
      </div>

      <SectionTitle>Segmentation</SectionTitle>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-4">
          <OsDonutChart data={analytics.os_distribution} />
        </div>
        <div className="col-span-12 xl:col-span-8">
          <TimeSegmentationChart
            hourly={analytics.hourly_distribution}
            weekday={analytics.weekday_distribution}
            timezone={analytics.timezone}
          />
        </div>
      </div>
      <AlgeriaWilayaMap
        locations={analytics.location_distribution}
        unknownCount={analytics.location_unknown_count}
      />
    </div>
  );
};
