import React, { useMemo } from "react";
import { ClipboardList, CreditCard, Megaphone, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { PATHS } from "../../dashboard/paths";
import { useBillingUsageAnalytics } from "../../hooks/useOrganizationAnalytics";
import {
  buildQuotaRows,
  formatAmount,
  formatMonthLabel,
  formatMonthName,
  usagePercent,
} from "../../lib/billingUsageTransforms";
import { formatDayLabel } from "../../lib/campaignAnalyticsTransforms";
import { PLAN_ALLOWANCES, type PlanAllowance } from "../../lib/planAllowances";
import { BillingPayment, BillingUsageAnalytics } from "../../types";
import {
  AnalyticsError,
  AnalyticsLoading,
  SectionTitle,
} from "./AnalyticsControls";
import { ChartPanel, useChartTheme } from "./CampaignAnalyticsCharts";
import {
  DayRuler,
  KpiCard,
  KpiGrid,
  percentOf,
  roundedShare,
} from "./KpiCards";

/** "Oct 25" for a day of a YYYY-MM month. */
const monthDayLabel = (month: string, day: number) => {
  const date = new Date(`${month}-${String(day).padStart(2, "0")}T00:00:00Z`);
  return isNaN(date.getTime())
    ? String(day)
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
};

const PAYMENT_BADGES: Record<BillingPayment["status"], string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-300",
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-300",
  failed:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/70 dark:text-red-300",
  refunded: "border-brand-border text-brand-text-muted",
};

const headCell =
  "pb-2 px-2 font-medium uppercase text-[10px] tracking-wider text-brand-text-muted";

interface SectionProps {
  analytics: BillingUsageAnalytics;
  allowance: PlanAllowance;
}

const QuotaChart: React.FC<SectionProps> = ({ analytics, allowance }) => {
  const chart = useChartTheme();
  const month = analytics.current_month;
  const rows = useMemo(
    () => buildQuotaRows(analytics.daily_usage, month.projected_entries),
    [analytics.daily_usage, month.projected_entries],
  );
  const limit = allowance.entriesPerMonth;
  const axisTick = { fill: chart.axis, fontSize: 11 };

  return (
    <ChartPanel
      title="Allowance used this month"
      subtitle={`Entries counted since the 1st of ${formatMonthName(month.month)}, against the ${limit.toLocaleString()} entries of the ${allowance.label} plan.`}
      className="h-full"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 16, right: 12, left: -8, bottom: 0 }}
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
              domain={[0, Math.max(limit, month.projected_entries)]}
            />
            <Tooltip
              {...chart.tooltip}
              cursor={{ stroke: chart.grid }}
              labelFormatter={(date) => formatDayLabel(String(date))}
            />
            <Legend
              verticalAlign="top"
              height={32}
              iconType="plainline"
              formatter={(value) => (
                <span className="text-[11px] text-brand-text-muted">
                  {value}
                </span>
              )}
            />
            <ReferenceLine
              y={limit}
              stroke={chart.axis}
              strokeDasharray="2 4"
              label={{
                value: `Plan allowance: ${limit.toLocaleString()}`,
                position: "insideTopRight",
                fill: chart.axis,
                fontSize: 11,
              }}
            />
            <Line
              type="monotone"
              dataKey="projected"
              name="Projected at the current pace"
              stroke={chart.series[0]}
              strokeWidth={2}
              strokeDasharray="5 5"
              strokeOpacity={0.6}
              dot={false}
              activeDot={{ r: 4, stroke: chart.surface, strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="used"
              name="Entries used"
              stroke={chart.series[0]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: chart.surface, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
};

const CampaignUsagePanel: React.FC<SectionProps> = ({ analytics }) => {
  const chart = useChartTheme();
  const rows = analytics.usage_by_campaign;
  const total = analytics.current_month.entries;
  const maxEntries = rows[0]?.entries ?? 0;

  return (
    <ChartPanel
      title="What used the allowance"
      subtitle="Entries of this month, per campaign."
      isEmpty={rows.length === 0}
      emptyMessage="No entry recorded this month."
      className="h-full"
    >
      <ul className="max-h-72 space-y-3 overflow-auto">
        {rows.map((row) => (
          <li key={row.campaign_id}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <Link
                to={PATHS.analyticsFor(row.campaign_id)}
                className="truncate font-semibold text-brand-text hover:underline"
                title={row.campaign_name}
                dir="auto"
              >
                {row.campaign_name}
              </Link>
              <span className="flex-shrink-0 text-brand-text-muted">
                <span className="font-semibold text-brand-text">
                  {row.entries.toLocaleString()}
                </span>{" "}
                · {((row.entries / total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-card-bg-subtle">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(row.entries / maxEntries) * 100}%`,
                  backgroundColor: chart.series[0],
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </ChartPanel>
  );
};

const MonthlyUsageChart: React.FC<SectionProps> = ({
  analytics,
  allowance,
}) => {
  const chart = useChartTheme();
  const rows = analytics.monthly_usage;
  const limit = allowance.entriesPerMonth;
  const peak = Math.max(0, ...rows.map((row) => row.entries));
  const axisTick = { fill: chart.axis, fontSize: 11 };

  return (
    <ChartPanel
      title="Entries per month"
      subtitle={`The last ${rows.length} months against the current plan's allowance. The current month is still running.`}
      isEmpty={peak === 0}
      emptyMessage="No entry recorded in the last months."
      className="h-full"
    >
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 16, right: 12, left: -8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke={chart.grid} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              tickFormatter={formatMonthLabel}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              allowDecimals={false}
              domain={[0, Math.max(limit, peak)]}
            />
            <Tooltip
              {...chart.tooltip}
              labelFormatter={(value) => formatMonthName(String(value))}
              cursor={{
                fill: chart.isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
              }}
            />
            <ReferenceLine
              y={limit}
              stroke={chart.axis}
              strokeDasharray="2 4"
              label={{
                value: `Plan allowance: ${limit.toLocaleString()}`,
                position: "insideTopRight",
                fill: chart.axis,
                fontSize: 11,
              }}
            />
            <Bar
              dataKey="entries"
              name="Entries"
              fill={chart.series[0]}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
};

const PaymentsPanel: React.FC<SectionProps> = ({ analytics }) => (
  <ChartPanel
    title="Billing history"
    subtitle={`${formatAmount(analytics.total_paid)} paid in total.`}
    isEmpty={analytics.payments.length === 0}
    emptyMessage="Nothing billed yet."
    className="h-full"
  >
    <div className="max-h-72 overflow-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-brand-border/50">
            <th className={headCell}>Period</th>
            <th className={headCell}>Plan</th>
            <th className={`${headCell} text-right`}>Amount</th>
            <th className={`${headCell} text-right`}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border/30">
          {analytics.payments.map((payment) => (
            <tr key={payment.id}>
              <td className="py-2.5 px-2 text-brand-text">
                {formatDayLabel(payment.period_start)} –{" "}
                {formatDayLabel(payment.period_end)}
              </td>
              <td className="py-2.5 px-2 capitalize text-brand-text">
                {payment.plan}
                <span className="text-brand-text-muted">
                  {" "}
                  · {payment.billing_cycle.replace("_", " ")}
                </span>
              </td>
              <td className="py-2.5 px-2 text-right font-semibold text-brand-text">
                {formatAmount(payment.amount)}
              </td>
              <td className="py-2.5 px-2">
                <span
                  className={`ml-auto block w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${PAYMENT_BADGES[payment.status]}`}
                >
                  {payment.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </ChartPanel>
);

/**
 * How much of its plan the organization uses, and how that evolved. The counts come from
 * the `get_billing_usage_analytics` RPC; the allowance of each plan from `planAllowances`.
 */
export const BillingAnalyticsDashboard: React.FC = () => {
  const { organization } = useAuth();
  const { analytics, loading, refreshing, error } = useBillingUsageAnalytics(
    organization?.id ?? null,
  );

  if (loading && !analytics) return <AnalyticsLoading />;
  if (error || !analytics) {
    return (
      <AnalyticsError
        message={error || "Billing usage unavailable right now."}
      />
    );
  }

  const allowance = PLAN_ALLOWANCES[analytics.plan] ?? PLAN_ALLOWANCES.free;
  const month = analytics.current_month;
  const limit = allowance.entriesPerMonth;
  const used = usagePercent(month.entries, limit);
  const overshoot = month.projected_entries - limit;
  const campaignLimit = allowance.activeCampaigns;
  const subscription = analytics.subscription;

  return (
    <div
      id="billing-analytics-dashboard"
      className={`mb-4 space-y-4 transition-opacity ${refreshing ? "opacity-60" : ""}`}
    >
      <SectionTitle
        index="01"
        action={
          <Link to={PATHS.billing} className="kx-btn">
            Manage plan
          </Link>
        }
      >
        {formatMonthName(month.month)} · day {month.days_elapsed} of{" "}
        {month.days_in_month}
      </SectionTitle>

      <DayRuler
        today={month.days_elapsed}
        daysInMonth={month.days_in_month}
        startLabel={monthDayLabel(month.month, 1)}
        todayLabel={`Today · ${monthDayLabel(month.month, month.days_elapsed)}`}
        endLabel={monthDayLabel(month.month, month.days_in_month)}
      />

      <KpiGrid>
        <KpiCard
          label="Current plan"
          kind="Plan"
          tone="blue"
          icon={CreditCard}
          value={allowance.label}
          description={
            subscription
              ? `Billing period ends ${formatDayLabel(subscription.period_end)} · ${subscription.days_left} ${subscription.days_left === 1 ? "day" : "days"} left`
              : "No billing period running"
          }
        />
        <KpiCard
          label="Entries this month"
          kind="Usage"
          tone="teal"
          icon={ClipboardList}
          value={month.entries.toLocaleString()}
          suffix={`/ ${limit.toLocaleString()}`}
          description={`${used}% used · ${Math.max(0, limit - month.entries).toLocaleString()} left · ${month.entries_last_month.toLocaleString()} last month`}
          meter={{
            type: "seg",
            pct: percentOf(month.entries, limit),
            left: "Monthly allowance",
            right: roundedShare(month.entries, limit),
          }}
        />
        <KpiCard
          label="Projected by month end"
          kind="Forecast"
          tone="vio"
          icon={TrendingUp}
          value={month.projected_entries.toLocaleString()}
          description={
            overshoot > 0
              ? `${overshoot.toLocaleString()} over the allowance at the current pace`
              : `${usagePercent(month.projected_entries, limit)}% of the allowance at the current pace`
          }
          meter={{
            type: "seg",
            pct: percentOf(month.projected_entries, limit),
            left: "Projected vs allowance",
            right: roundedShare(month.projected_entries, limit),
          }}
        />
        <KpiCard
          label="Active campaigns"
          kind="Capacity"
          tone="amber"
          icon={Megaphone}
          value={month.active_campaigns.toLocaleString()}
          suffix={campaignLimit === null ? undefined : `/ ${campaignLimit}`}
          description={
            campaignLimit === null
              ? "No limit on this plan"
              : month.active_campaigns > campaignLimit
                ? `${month.active_campaigns - campaignLimit} over the plan's limit`
                : `${campaignLimit - month.active_campaigns} more can run at once`
          }
          meter={
            campaignLimit === null || campaignLimit <= 0
              ? null
              : {
                  type: "blocks",
                  on: month.active_campaigns,
                  total: campaignLimit,
                  left: "Slots in use",
                  right: `${month.active_campaigns} of ${campaignLimit}`,
                }
          }
        />
      </KpiGrid>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8">
          <QuotaChart analytics={analytics} allowance={allowance} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <CampaignUsagePanel analytics={analytics} allowance={allowance} />
        </div>
      </div>

      <SectionTitle index="02">Over time</SectionTitle>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-7">
          <MonthlyUsageChart analytics={analytics} allowance={allowance} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <PaymentsPanel analytics={analytics} allowance={allowance} />
        </div>
      </div>

      <p className="text-[11px] text-brand-text-muted">
        Active campaigns include scheduled ones that have not ended; no more
        than {campaignLimit ?? "the limit"} can be active at once. The monthly
        entry allowance is shown for information and not enforced yet.
      </p>
    </div>
  );
};
