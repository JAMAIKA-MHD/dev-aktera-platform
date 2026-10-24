import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Gift,
  PackageCheck,
  Ticket,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import {
  useRewardAnalytics,
  useRewardStockUsage,
} from "../../hooks/useOrganizationAnalytics";
import {
  formatDayLabel,
  OTHER_SERIES_COLOR,
} from "../../lib/campaignAnalyticsTransforms";
import {
  programPeriodStart,
  type ProgramPeriodKey,
} from "../../lib/programAnalyticsTransforms";
import {
  RewardAnalytics,
  RewardCategory,
  RewardStockCounts,
  RewardStockRow,
  RewardStockUsagePoint,
} from "../../types";
import {
  AnalyticsError,
  AnalyticsLoading,
  PeriodToggle,
  SectionTitle,
} from "./AnalyticsControls";
import { ChartPanel, StatCard, useChartTheme } from "./CampaignAnalyticsCharts";

const TYPE_META: Record<
  RewardCategory,
  { label: string; plural: string; icon: LucideIcon }
> = {
  physical: { label: "Physical", plural: "Physical gifts", icon: Gift },
  voucher: { label: "Voucher", plural: "Vouchers", icon: Ticket },
};

const TYPE_FILTERS = [
  { key: "all", label: "All rewards" },
  { key: "physical", label: TYPE_META.physical.plural },
  { key: "voucher", label: TYPE_META.voucher.plural },
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number]["key"];

type StockTotals = RewardAnalytics["totals"];

/** The headline counts of the selected type; the types add up to `totals`. */
function totalsOf(analytics: RewardAnalytics, filter: TypeFilter): StockTotals {
  if (filter === "all") return analytics.totals;
  const type = analytics.by_type.find((row) => row.category === filter);
  return {
    rewards: type?.rewards ?? 0,
    total_stock: type?.total_stock ?? 0,
    won: type?.won ?? 0,
    reserved: type?.reserved ?? 0,
    unallocated: type?.unallocated ?? 0,
    remaining: type?.remaining ?? 0,
    won_in_period: type?.won_in_period ?? 0,
    at_risk: type?.at_risk ?? 0,
    out_of_stock: type?.out_of_stock ?? 0,
    codes_missing: type?.codes_missing ?? 0,
  };
}

const includesType = (filter: TypeFilter, category: RewardCategory) =>
  filter === "all" || filter === category;

/** "rewards", "physical gifts" or "vouchers", for the sentences of the page. */
const typeNoun = (filter: TypeFilter) =>
  filter === "all" ? "rewards" : TYPE_META[filter].plural.toLowerCase();

type StockState = "won" | "reserved" | "unallocated";

const STOCK_STATES: { key: StockState; label: string; hint: string }[] = [
  { key: "won", label: "Won", hint: "Already won by players" },
  {
    key: "reserved",
    label: "Reserved",
    hint: "Committed to a draft, active or paused campaign, not won yet",
  },
  {
    key: "unallocated",
    label: "Unallocated",
    hint: "Free to put in a campaign",
  },
];

const STATUS_META: Record<
  NonNullable<RewardStockRow["risk"]> | "ok" | "empty",
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
  ok: {
    label: "Healthy",
    icon: CheckCircle2,
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-300",
  },
  empty: {
    label: "No stock",
    icon: Boxes,
    badge: "border-brand-border text-brand-text-muted",
  },
};

const headCell =
  "pb-2 px-2 font-medium uppercase text-[10px] tracking-wider text-brand-text-muted";

const share = (part: number, total: number) =>
  total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "—";

function useStockColors(): Record<StockState, string> {
  const chart = useChartTheme();
  return useMemo(
    () => ({
      won: chart.series[0],
      reserved: chart.series[3],
      unallocated: OTHER_SERIES_COLOR,
    }),
    [chart],
  );
}

/** One bar split into won / reserved / unallocated, with a gap between segments. */
const StockBar: React.FC<{ counts: RewardStockCounts; className?: string }> = ({
  counts,
  className = "h-2.5",
}) => {
  const colors = useStockColors();
  return (
    <div
      className={`flex w-full gap-0.5 overflow-hidden rounded-full bg-card-bg-subtle ${className}`}
    >
      {counts.total_stock > 0 &&
        STOCK_STATES.filter((state) => counts[state.key] > 0).map((state) => (
          <div
            key={state.key}
            className="h-full rounded-sm"
            title={`${state.label}: ${counts[state.key].toLocaleString()} (${share(counts[state.key], counts.total_stock)})`}
            style={{
              width: `${(counts[state.key] / counts.total_stock) * 100}%`,
              backgroundColor: colors[state.key],
            }}
          />
        ))}
    </div>
  );
};

const StockLegend: React.FC = () => {
  const colors = useStockColors();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-brand-text-muted">
      {STOCK_STATES.map((state) => (
        <li
          key={state.key}
          className="flex items-center gap-1.5"
          title={state.hint}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: colors[state.key] }}
          />
          {state.label}
        </li>
      ))}
    </ul>
  );
};

interface SectionProps {
  analytics: RewardAnalytics;
  typeFilter: TypeFilter;
}

const StockByTypePanel: React.FC<SectionProps> = ({
  analytics,
  typeFilter,
}) => (
  <ChartPanel
    title={
      typeFilter === "all"
        ? "Stock by reward type"
        : `Stock of ${typeNoun(typeFilter)}`
    }
    subtitle={
      typeFilter === "all"
        ? "Where every unit stands today, for physical gifts and for vouchers."
        : "Where every unit stands today."
    }
    isEmpty={totalsOf(analytics, typeFilter).total_stock === 0}
    emptyMessage={`No ${typeNoun(typeFilter)} in stock yet.`}
    className="h-full"
  >
    <div className="space-y-5">
      <StockLegend />
      {analytics.by_type
        .filter((type) => includesType(typeFilter, type.category))
        .map((type) => {
          const meta = TYPE_META[type.category];
          const Icon = meta.icon;
          return (
            <div key={type.category}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-text">
                  <Icon className="h-3.5 w-3.5 text-brand-text-muted" />
                  {meta.plural}
                  <span className="font-normal text-brand-text-muted">
                    · {type.rewards} {type.rewards === 1 ? "reward" : "rewards"}
                  </span>
                </span>
                <span className="text-xs text-brand-text-muted">
                  <span className="font-semibold text-brand-text">
                    {type.remaining.toLocaleString()}
                  </span>{" "}
                  of {type.total_stock.toLocaleString()} left
                </span>
              </div>
              <StockBar counts={type} className="h-3" />
              <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-brand-text-muted">
                {STOCK_STATES.map((state) => (
                  <div key={state.key}>
                    <dt>{state.label}</dt>
                    <dd className="text-sm font-semibold text-brand-text">
                      {type[state.key].toLocaleString()}
                    </dd>
                  </div>
                ))}
              </dl>
              {type.category === "voucher" && type.total_stock > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-brand-text-muted">
                  {type.codes_missing > 0 ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      {type.codes_missing.toLocaleString()} voucher{" "}
                      {type.codes_missing === 1 ? "unit has" : "units have"} no
                      code yet: a winner would receive an empty voucher.
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Every voucher unit has its code.
                    </>
                  )}
                </p>
              )}
            </div>
          );
        })}
    </div>
  </ChartPanel>
);

/** One day of the chart: the stock left by type, and what was used that day. */
type UsageSeries = {
  key: RewardCategory;
  left: keyof RewardStockUsagePoint;
  used: keyof RewardStockUsagePoint;
};

const USAGE_SERIES: UsageSeries[] = [
  { key: "physical", left: "physical_remaining", used: "physical_used" },
  { key: "voucher", left: "voucher_remaining", used: "voucher_used" },
];

const daysLabel = (days: number) => {
  const rounded = Math.max(1, Math.round(days));
  return `${rounded.toLocaleString()} ${rounded === 1 ? "day" : "days"}`;
};

/**
 * How fast the stock was used: the stock left at the end of every day, stacked by type when
 * every reward is shown. Its own RPC (`get_reward_stock_usage`) filters by type and period.
 */
const StockUsageChart: React.FC<{
  organizationId: string | null;
  typeFilter: TypeFilter;
  periodKey: ProgramPeriodKey;
  onPeriodChange: (key: ProgramPeriodKey) => void;
}> = ({ organizationId, typeFilter, periodKey, onPeriodChange }) => {
  const chart = useChartTheme();
  const from = useMemo(() => programPeriodStart(periodKey), [periodKey]);
  const {
    analytics: usage,
    loading,
    refreshing,
    error,
  } = useRewardStockUsage(
    organizationId,
    typeFilter === "all" ? null : typeFilter,
    from,
  );
  const axisTick = { fill: chart.axis, fontSize: 11 };
  const noun = typeNoun(typeFilter);
  const series = USAGE_SERIES.filter((item) =>
    includesType(typeFilter, item.key),
  );
  const colors: Record<RewardCategory, string> = {
    physical: chart.series[1],
    voucher: chart.series[2],
  };
  const summary = usage?.summary;

  let subtitle = "How much stock was left at the end of each day.";
  if (summary && summary.used_in_period > 0) {
    const pct =
      summary.used_percentage === null
        ? ""
        : ` (${summary.used_percentage}% of the stock at the start)`;
    subtitle = `${summary.used_in_period.toLocaleString()} units of ${noun} used in this period${pct}, about ${summary.used_per_day} a day.`;
  }

  return (
    <ChartPanel
      title={`How fast the stock of ${noun} is used`}
      subtitle={subtitle}
      actions={<PeriodToggle value={periodKey} onChange={onPeriodChange} />}
      isEmpty={!loading && !error && (summary?.total_stock ?? 0) === 0}
      emptyMessage={`No ${noun} in stock yet.`}
      className="h-full"
    >
      {error ? (
        <div className="flex min-h-48 flex-1 items-center justify-center text-xs font-medium text-red-400">
          {error}
        </div>
      ) : !usage ? (
        <div className="flex min-h-48 flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
        </div>
      ) : (
        <div className={`transition-opacity ${refreshing ? "opacity-60" : ""}`}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={usage.daily}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke={chart.grid} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  tickFormatter={formatDayLabel}
                  minTickGap={24}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={axisTick}
                  allowDecimals={false}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  {...chart.tooltip}
                  cursor={{ stroke: chart.grid }}
                  labelFormatter={(date) => formatDayLabel(String(date))}
                  formatter={(value, name, item) => {
                    const point = item.payload as RewardStockUsagePoint;
                    const line = series.find(
                      (entry) => TYPE_META[entry.key].plural === name,
                    );
                    const used = line ? Number(point[line.used] ?? 0) : 0;
                    return [
                      `${Number(value).toLocaleString()} left · ${used.toLocaleString()} used that day`,
                      name,
                    ];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-[11px] text-brand-text-muted">
                      {value} left
                    </span>
                  )}
                />
                {series.map((item) => (
                  <Area
                    key={item.key}
                    type="monotone"
                    dataKey={item.left}
                    name={TYPE_META[item.key].plural}
                    stackId="left"
                    stroke={colors[item.key]}
                    strokeWidth={2}
                    fill={colors[item.key]}
                    fillOpacity={0.18}
                    activeDot={{ r: 4, stroke: chart.surface, strokeWidth: 2 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {summary && (
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-brand-border/50 pt-3 text-[11px] text-brand-text-muted">
              <div>
                <dt>Left now</dt>
                <dd className="text-sm font-semibold text-brand-text">
                  {summary.remaining.toLocaleString()}
                  <span className="font-normal text-brand-text-muted">
                    {" "}
                    / {summary.total_stock.toLocaleString()}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Used per day, last 7 days</dt>
                <dd className="text-sm font-semibold text-brand-text">
                  {summary.recent_used_per_day}
                </dd>
              </div>
              <div>
                <dt>Lasts at that pace</dt>
                <dd className="text-sm font-semibold text-brand-text">
                  {summary.remaining === 0
                    ? "None left"
                    : summary.days_left === null
                      ? "Not running out"
                      : `About ${daysLabel(summary.days_left)}`}
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </ChartPanel>
  );
};

/** How long the stock lasts at the last 7 days' pace, and why, for the hover hint. */
const runway = (row: RewardStockRow): { label: string; hint: string } => {
  if (row.total_stock === 0) {
    return { label: "—", hint: "This reward has no stock." };
  }
  if (row.remaining === 0) {
    return { label: "None left", hint: "Every unit has been won." };
  }
  if (row.days_left !== null) {
    const days = Math.max(1, Math.round(row.days_left));
    return {
      label: `About ${days} ${days === 1 ? "day" : "days"}`,
      hint: `At ${row.wins_per_day} won per day, the pace of the last 7 days.`,
    };
  }
  // Nothing won in the last 7 days: the stock is not going down, so it does not run out.
  if (row.active_campaigns === 0) {
    return {
      label: "Not in use",
      hint: "No live campaign gives this reward, so its stock is not being used.",
    };
  }
  return {
    label: "Not running out",
    hint: "None won in the last 7 days: at this pace the stock does not run out.",
  };
};

const StockTable: React.FC<SectionProps> = ({ analytics, typeFilter }) => {
  const rows = useMemo(
    () =>
      analytics.rewards.filter((row) => includesType(typeFilter, row.category)),
    [analytics.rewards, typeFilter],
  );

  return (
    <ChartPanel
      title="Stock by reward"
      subtitle="Most urgent first. Time left is the remaining stock at the pace of the last 7 days."
      isEmpty={rows.length === 0}
      emptyMessage={
        analytics.rewards.length === 0
          ? "No reward in the library yet."
          : "No reward of this type."
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-brand-border/50">
              <th className={headCell}>Reward</th>
              <th className={`${headCell} w-1/4`}>Stock</th>
              <th className={`${headCell} text-right`}>Left</th>
              <th className={`${headCell} text-right`}>Reserved</th>
              <th className={`${headCell} text-right`}>Won / day</th>
              <th className={`${headCell} text-right`}>Time left</th>
              <th className={`${headCell} text-right`}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/30">
            {rows.map((row) => {
              const type = TYPE_META[row.category];
              const TypeIcon = type.icon;
              const status =
                STATUS_META[row.risk ?? (row.total_stock > 0 ? "ok" : "empty")];
              const StatusIcon = status.icon;
              return (
                <tr key={row.template_id}>
                  <td className="py-2.5 px-2">
                    <div
                      className="font-semibold text-brand-text"
                      title={row.name}
                      dir="auto"
                    >
                      {row.name}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-brand-text-muted">
                      <TypeIcon className="h-3 w-3" />
                      {type.label} · {row.active_campaigns} active{" "}
                      {row.active_campaigns === 1 ? "campaign" : "campaigns"}
                      {row.codes_missing > 0 &&
                        ` · ${row.codes_missing.toLocaleString()} codes missing`}
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <StockBar counts={row} />
                  </td>
                  <td className="py-2.5 px-2 text-right text-brand-text">
                    <span className="font-semibold">
                      {row.remaining.toLocaleString()}
                    </span>
                    <span className="text-brand-text-muted">
                      {" "}
                      / {row.total_stock.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right text-brand-text">
                    {row.reserved.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right text-brand-text">
                    {row.wins_per_day}
                  </td>
                  <td className="py-2.5 px-2 text-right text-brand-text">
                    <span title={runway(row).hint} className="cursor-help">
                      {runway(row).label}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`ml-auto flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${status.badge}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartPanel>
  );
};

/**
 * The reward stock of the organization: by type, over time and by reward. Every number
 * comes from the `get_reward_analytics` and `get_reward_stock_usage` RPCs; the browser
 * only lays them out.
 */
export const RewardAnalyticsDashboard: React.FC = () => {
  const { organization } = useAuth();
  const [periodKey, setPeriodKey] = useState<ProgramPeriodKey>("30d");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const { analytics, loading, refreshing, error } = useRewardAnalytics(
    organization?.id ?? null,
  );

  if (loading && !analytics) return <AnalyticsLoading />;
  if (error || !analytics) {
    return (
      <AnalyticsError message={error || "Analytics unavailable right now."} />
    );
  }

  const totals = totalsOf(analytics, typeFilter);

  return (
    <div
      id="reward-analytics-dashboard"
      className={`mb-4 space-y-4 transition-opacity ${refreshing ? "opacity-60" : ""}`}
    >
      <div className="relative w-fit">
        <select
          aria-label="Reward type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="glass-panel px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-brand-text hover:bg-card-bg-subtle outline-none appearance-none cursor-pointer pr-8"
        >
          {TYPE_FILTERS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-textMuted">
          <span className="material-symbols-outlined text-[14px]">
            expand_more
          </span>
        </div>
      </div>

      <SectionTitle>Stock right now</SectionTitle>
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Left in stock"
          value={totals.remaining.toLocaleString()}
          caption={`Of ${totals.total_stock.toLocaleString()} units across ${totals.rewards} ${totals.rewards === 1 ? "reward" : "rewards"}`}
          icon={<Boxes className="h-4 w-4" />}
        />
        <StatCard
          title="Won by players"
          value={totals.won.toLocaleString()}
          caption={
            totals.total_stock > 0
              ? `${share(totals.won, totals.total_stock)} of the stock, all time`
              : "No stock yet"
          }
          icon={<Gift className="h-4 w-4" />}
        />
        <StatCard
          title="Free to allocate"
          value={totals.unallocated.toLocaleString()}
          caption={`${totals.reserved.toLocaleString()} more reserved in campaigns`}
          icon={<PackageCheck className="h-4 w-4" />}
        />
        <StatCard
          title="Rewards running low"
          value={totals.at_risk.toLocaleString()}
          caption={
            totals.at_risk === 0
              ? `None of the ${typeNoun(typeFilter)} is close to running out`
              : `${totals.out_of_stock} out of stock · see the table below`
          }
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-5">
          <StockByTypePanel analytics={analytics} typeFilter={typeFilter} />
        </div>
        <div className="col-span-12 xl:col-span-7">
          <StockUsageChart
            organizationId={organization?.id ?? null}
            typeFilter={typeFilter}
            periodKey={periodKey}
            onPeriodChange={setPeriodKey}
          />
        </div>
      </div>

      <StockTable analytics={analytics} typeFilter={typeFilter} />
    </div>
  );
};
