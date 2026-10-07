import React, { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "../../contexts/ThemeContext";
import {
  CampaignDailyPoint,
  CampaignHourlyPoint,
  CampaignOsDistribution,
  CampaignPrizeDailyWins,
  CampaignWeekdayPoint,
} from "../../types";
import {
  availableTimeRanges,
  buildPrizeSeries,
  campaignLifespan,
  formatDayLabel,
  sliceDailyPoints,
  TIME_RANGES,
  type TimeRangeKey,
  OTHER_SERIES_COLOR,
  SERIES_COLORS_DARK,
  SERIES_COLORS_LIGHT,
  WEEKDAY_LABELS,
} from "../../lib/campaignAnalyticsTransforms";

const ALL_PRIZES = "all";

export function useChartTheme() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return useMemo(
    () => ({
      isDark,
      series: isDark ? SERIES_COLORS_DARK : SERIES_COLORS_LIGHT,
      grid: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
      axis: isDark ? "#94a3b8" : "#64748b",
      surface: isDark ? "#171c28" : "#ffffff",
      tooltip: {
        contentStyle: {
          backgroundColor: isDark ? "#111726" : "#ffffff",
          borderColor: isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0",
          borderRadius: "12px",
          fontSize: "12px",
          boxShadow: "0 4px 12px rgb(0 0 0 / 0.12)",
        },
        itemStyle: { color: isDark ? "#e2e8f0" : "#0f172a", fontWeight: 600 },
        labelStyle: {
          color: isDark ? "#94a3b8" : "#64748b",
          marginBottom: "4px",
        },
      },
    }),
    [isDark],
  );
}

interface StatCardProps {
  title: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  caption,
  icon,
}) => (
  <div className="glass-panel rounded-xl p-4 flex flex-col gap-1.5 min-h-28">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[10px] uppercase font-semibold tracking-wider text-brand-text-muted">
        {title}
      </h3>
      <span className="text-brand-text-muted">{icon}</span>
    </div>
    <div className="text-2xl font-bold text-brand-text">{value}</div>
    <div className="text-[11px] text-brand-text-muted">{caption}</div>
  </div>
);

interface ChartPanelProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  children: React.ReactNode;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({
  title,
  subtitle,
  actions,
  isEmpty = false,
  emptyMessage = "No data recorded yet.",
  className = "",
  children,
}) => (
  <div className={`glass-panel rounded-xl p-4 flex flex-col ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
      <div>
        <h2 className="text-base font-semibold text-brand-text">{title}</h2>
        <p className="text-[11px] text-brand-text-muted">{subtitle}</p>
      </div>
      {actions}
    </div>
    {isEmpty ? (
      <div className="flex-1 min-h-48 flex items-center justify-center rounded-xl border border-dashed border-brand-border text-xs text-brand-text-muted">
        {emptyMessage}
      </div>
    ) : (
      children
    )}
  </div>
);

interface ParticipantsLineChartProps {
  data: CampaignDailyPoint[];
  campaign: { start_date: string | null; end_date: string | null };
  timezone: string;
}

export const ParticipantsLineChart: React.FC<ParticipantsLineChartProps> = ({
  data,
  campaign,
  timezone,
}) => {
  const chart = useChartTheme();
  const [chosenRange, setChosenRange] = useState<TimeRangeKey | null>(null);

  const lifespan = useMemo(
    () => campaignLifespan(data, campaign, timezone),
    [data, campaign, timezone],
  );
  const available = useMemo(
    () => (lifespan ? availableTimeRanges(lifespan.days) : []),
    [lifespan],
  );
  // Until the user picks one, show the widest range the campaign can fill.
  const range =
    chosenRange && available.includes(chosenRange)
      ? chosenRange
      : (available[available.length - 1] ?? TIME_RANGES[0].key);

  const points = useMemo(
    () => (lifespan ? sliceDailyPoints(data, lifespan, range) : []),
    [data, lifespan, range],
  );
  const rows = useMemo(
    () =>
      points.map((d) => ({
        label: formatDayLabel(d.date),
        entries: d.entries,
      })),
    [points],
  );
  const hasEntries = data.length > 0;
  const period =
    points.length > 0
      ? `${formatDayLabel(points[0].date)} – ${formatDayLabel(points[points.length - 1].date)}`
      : "";
  const lifespanDays = lifespan?.days ?? 0;

  return (
    <ChartPanel
      title="Participants over time"
      subtitle={
        hasEntries && period
          ? `Entries recorded per day · ${period}`
          : "Entries recorded per day."
      }
      actions={
        hasEntries && (
          <div
            role="group"
            aria-label="Time range"
            className="flex items-center glass-panel p-0.5 rounded-xl text-[11px]"
          >
            {TIME_RANGES.map((option) => {
              const enabled = available.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={!enabled}
                  aria-pressed={range === option.key}
                  onClick={() => setChosenRange(option.key)}
                  title={
                    enabled
                      ? `Show the last ${option.label}`
                      : `This campaign has only run for ${lifespanDays} ${lifespanDays === 1 ? "day" : "days"}`
                  }
                  className={`px-2.5 py-0.5 font-semibold rounded-full transition-colors ${
                    range === option.key
                      ? "bg-brand-accent/20 text-brand-accent shadow-sm"
                      : enabled
                        ? "text-brand-text-muted hover:text-brand-text cursor-pointer"
                        : "text-brand-text-muted opacity-40 cursor-not-allowed"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )
      }
      isEmpty={!hasEntries}
      emptyMessage="No participants recorded yet."
      className="h-full"
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke={chart.grid} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
              minTickGap={24}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip {...chart.tooltip} cursor={{ stroke: chart.grid }} />
            <Line
              type="monotone"
              dataKey="entries"
              name="Entries"
              stroke={chart.series[0]}
              strokeWidth={2}
              dot={rows.length === 1 ? { r: 4 } : false}
              activeDot={{ r: 5, stroke: chart.surface, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
};

interface OsDonutChartProps {
  data: CampaignOsDistribution;
}

export const OsDonutChart: React.FC<OsDonutChartProps> = ({ data }) => {
  const chart = useChartTheme();
  const items = [
    { key: "android", label: "Android", count: data.android },
    { key: "ios", label: "iOS", count: data.ios },
    { key: "desktop", label: "Desktop", count: data.desktop },
    { key: "other", label: "Other", count: data.other },
  ].map((item, index) => ({ ...item, color: chart.series[index] }));
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const percentage = (count: number) =>
    total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

  return (
    <ChartPanel
      title="OS distribution"
      subtitle="Share of participants by device operating system."
      isEmpty={total === 0}
      emptyMessage="No participants recorded yet."
      className="h-full"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-44 w-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items.filter((item) => item.count > 0)}
                dataKey="count"
                nameKey="label"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
                stroke={chart.surface}
                strokeWidth={2}
              >
                {items
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <Cell key={item.key} fill={item.color} />
                  ))}
              </Pie>
              <Tooltip
                {...chart.tooltip}
                formatter={(value) => [
                  `${value} (${percentage(Number(value))}%)`,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-brand-text">
              {total.toLocaleString()}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-brand-text-muted">
              participants
            </span>
          </div>
        </div>

        <ul className="w-full space-y-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-2 text-brand-text">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
              <span className="text-brand-text-muted">
                <span className="font-semibold text-brand-text">
                  {percentage(item.count)}%
                </span>{" "}
                · {item.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartPanel>
  );
};

interface PrizeDistributionAreaChartProps {
  data: CampaignPrizeDailyWins[];
  days: CampaignDailyPoint[];
}

export const PrizeDistributionAreaChart: React.FC<
  PrizeDistributionAreaChartProps
> = ({ data, days }) => {
  const chart = useChartTheme();
  const [selectedPrize, setSelectedPrize] = useState<string>(ALL_PRIZES);

  const { rows, series } = useMemo(() => {
    const built = buildPrizeSeries(data, days);
    return {
      series: built.series.map((s) => ({
        ...s,
        color:
          s.colorIndex === null
            ? OTHER_SERIES_COLOR
            : chart.series[s.colorIndex],
      })),
      rows: built.rows.map((row) => ({
        label: formatDayLabel(row.date),
        ...row.values,
      })),
    };
  }, [data, days, chart.series]);

  // A prize that disappears from the data falls back to the combined view.
  const activePrize = series.some((s) => s.key === selectedPrize)
    ? selectedPrize
    : ALL_PRIZES;
  // Filtering keeps each prize's own color: color follows the prize, not its position.
  const visibleSeries =
    activePrize === ALL_PRIZES
      ? series
      : series.filter((s) => s.key === activePrize);

  return (
    <ChartPanel
      title="Prize distribution"
      subtitle={
        activePrize === ALL_PRIZES
          ? "Prizes won per day, by prize."
          : `Prizes won per day — ${visibleSeries[0]?.name ?? ""}.`
      }
      actions={
        series.length > 1 ? (
          <div className="relative flex-shrink-0">
            <select
              value={activePrize}
              onChange={(e) => setSelectedPrize(e.target.value)}
              aria-label="Filter by prize"
              className="glass-panel max-w-48 truncate px-3 py-1 pr-7 rounded-xl text-[11px] text-brand-text outline-none appearance-none cursor-pointer"
            >
              <option value={ALL_PRIZES}>All prizes</option>
              {series.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name} ({s.totalWins.toLocaleString()})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-brand-text-muted">
              <span className="material-symbols-outlined text-[14px]">
                expand_more
              </span>
            </div>
          </div>
        ) : undefined
      }
      isEmpty={series.length === 0}
      emptyMessage="No prizes have been won yet."
      className="h-full"
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={rows}
            margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke={chart.grid} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
              minTickGap={24}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip {...chart.tooltip} cursor={{ stroke: chart.grid }} />
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
            {visibleSeries.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stackId="prizes"
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.3}
                activeDot={{ r: 4, stroke: chart.surface, strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
};

type TimeSegmentationMode = "hours" | "week";

interface TimeSegmentationChartProps {
  hourly: CampaignHourlyPoint[];
  weekday: CampaignWeekdayPoint[];
  timezone: string;
}

export const TimeSegmentationChart: React.FC<TimeSegmentationChartProps> = ({
  hourly,
  weekday,
  timezone,
}) => {
  const chart = useChartTheme();
  const [mode, setMode] = useState<TimeSegmentationMode>("hours");

  const rows =
    mode === "hours"
      ? hourly.map((h) => ({
          label: `${String(h.hour).padStart(2, "0")}h`,
          entries: h.entries,
        }))
      : weekday.map((w) => ({
          label: WEEKDAY_LABELS[w.weekday - 1] ?? String(w.weekday),
          entries: w.entries,
        }));
  const hasData = rows.some((row) => row.entries > 0);

  const modeButton = (value: TimeSegmentationMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      aria-pressed={mode === value}
      className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full cursor-pointer transition-colors ${
        mode === value
          ? "bg-brand-accent/20 text-brand-accent shadow-sm"
          : "text-brand-text-muted hover:text-brand-text"
      }`}
    >
      {label}
    </button>
  );

  return (
    <ChartPanel
      title="Time segmentation"
      subtitle={
        mode === "hours"
          ? `Entries by hour of the day (${timezone}).`
          : `Entries by day of the week (${timezone}).`
      }
      actions={
        <div className="flex items-center glass-panel p-0.5 rounded-xl flex-shrink-0">
          {modeButton("hours", "By day (hours)")}
          {modeButton("week", "By week")}
        </div>
      }
      isEmpty={!hasData}
      emptyMessage="No participants recorded yet."
      className="h-full"
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke={chart.grid} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
              interval={mode === "hours" ? 2 : 0}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              {...chart.tooltip}
              cursor={{
                fill: chart.isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
              }}
            />
            <Bar
              dataKey="entries"
              name="Entries"
              fill={chart.series[0]}
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartPanel>
  );
};
