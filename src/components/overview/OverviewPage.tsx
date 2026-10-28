import { useState, type ComponentType, type SVGProps } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleHelp,
  Clock,
  Download,
  FerrisWheel,
  FileText,
  Gift,
  Info,
  LayoutGrid,
  MousePointerClick,
  Pencil,
  Plus,
  ShieldCheck,
  Ticket,
  TriangleAlert,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import "./overview.css";

// The Overview page of the console: what needs attention, the headline numbers, performance
// over the last 30 days, campaigns, traffic sources, launch times, the plan's quota and the
// team's recent activity. Every number below is MOCK data, kept in named constants so that
// each block can be wired to real data on its own. Nothing here fetches anything.

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
type Metric = "k1" | "k2" | "k3" | "k4";

// ── Mock data ────────────────────────────────────────────────────────────────

const ATTENTION_ITEMS = [
  {
    tone: "danger",
    icon: Clock,
    title: "2 campaigns are about to end",
    badge: { tone: "bad", label: "Ends in 3 days" },
    description: "Autumn Gift Wheel and Back to School Quiz stop on 31 Oct.",
    when: "Ends Sat 31 Oct, 23:59",
    progress: 92,
    progressTone: "danger",
    caption: "92% of runtime used",
    action: "Extend or archive",
  },
  {
    tone: "warning",
    icon: Gift,
    title: "Free coffee voucher is running low",
    badge: { tone: "warn", label: "Low stock" },
    description: "Players will see “out of stock” once it reaches zero.",
    when: "Raised 28 Oct, 12:08",
    progress: 90,
    progressTone: "warning",
    caption: "45 of 500 left",
    action: "Restock",
  },
  {
    tone: "info",
    icon: ShieldCheck,
    title: "Verify your NIF · Tax ID",
    badge: { tone: "info", label: "Due 1 Nov" },
    description: "Needed on your next invoice. It takes about 2 minutes.",
    when: "Due Sun 1 Nov, 09:00",
    progress: 66,
    progressTone: "brand",
    caption: "2 of 3 identifiers verified",
    action: "Verify now",
  },
] as const;

// Daily clicks in thousands over the last 30 days (29 Sep to 28 Oct). Conversions and
// rewards follow the same weekly rhythm (higher on weekdays), scaled to their own totals.
const CLICKS_SHAPE = [
  12.1, 13.4, 15.2, 16.8, 14.9, 11.2, 10.8, 12.9, 14.6, 16.1, 17.9, 15.3, 11.8,
  11.1, 13.5, 15.4, 17.2, 19.2, 16.0, 12.4, 11.5, 14.1, 16.0, 17.8, 18.6, 16.4,
  12.9, 12.0, 14.7, 16.3,
];
const PREVIOUS_RATIO = 0.75; // the previous 30 days: the same shape, a quarter lower
const scaled = (total: number) => {
  const sum = CLICKS_SHAPE.reduce((a, b) => a + b, 0);
  return CLICKS_SHAPE.map((value) => (value / sum) * total);
};

type SeriesKey = "clicks" | "conversions" | "rewards";
const CHART_SERIES: Record<
  SeriesKey,
  {
    tab: string;
    color: "c-blue" | "c-teal" | "c-amber";
    values: number[]; // thousands a day
    top: number; // the y-axis's top, in thousands
    ticks: string[];
    total: string;
    delta: string;
    previous: string;
    peak: string;
  }
> = {
  clicks: {
    tab: "Clicks",
    color: "c-blue",
    values: scaled(428),
    top: 20,
    ticks: ["0", "5K", "10K", "15K", "20K"],
    total: "428K",
    delta: "34%",
    previous: "vs 319K in the previous 30 days",
    peak: "Fri 16 Oct · 18.8K clicks",
  },
  conversions: {
    tab: "Conversions",
    color: "c-teal",
    values: scaled(52.8),
    top: 2.4,
    ticks: ["0", "0.6K", "1.2K", "1.8K", "2.4K"],
    total: "52.8K",
    delta: "18%",
    previous: "vs 44.7K in the previous 30 days",
    peak: "Fri 16 Oct · 2.3K conversions",
  },
  rewards: {
    tab: "Rewards handed out",
    color: "c-amber",
    values: scaled(156),
    top: 8,
    ticks: ["0", "2K", "4K", "6K", "8K"],
    total: "156K",
    delta: "47%",
    previous: "vs 106K in the previous 30 days",
    peak: "Fri 16 Oct · 6.8K rewards",
  },
};
const X_LABELS = [
  { day: 0, label: "29 Sep" },
  { day: 7, label: "6 Oct" },
  { day: 14, label: "13 Oct" },
  { day: 21, label: "20 Oct" },
  { day: 28, label: "27 Oct" },
];

const KPIS: {
  metric: Metric;
  icon: Icon;
  label: string;
  delta: string;
  value: string;
  caption: string;
  visual:
    | { kind: "spark"; series: SeriesKey }
    | { kind: "split"; share: number; label: string; detail: string }
    | { kind: "ring"; share: number };
}[] = [
  {
    metric: "k1",
    icon: MousePointerClick,
    label: "Campaign clicks",
    delta: "34%",
    value: "428K",
    caption: "vs 319K previous period",
    visual: { kind: "spark", series: "clicks" },
  },
  {
    metric: "k2",
    icon: CircleCheck,
    label: "Conversions",
    delta: "18%",
    value: "52.8K",
    caption: "12.3% conversion rate",
    visual: { kind: "spark", series: "conversions" },
  },
  {
    metric: "k3",
    icon: Gift,
    label: "Rewards handed out",
    delta: "47%",
    value: "156K",
    caption: "across 4 live campaigns",
    visual: {
      kind: "split",
      share: 24.5,
      label: "24.5%",
      detail: "38.2K of 156K",
    },
  },
  {
    metric: "k4",
    icon: Trophy,
    label: "Average win rate",
    delta: "3 pts",
    value: "57%",
    caption: "of players won a reward",
    visual: { kind: "ring", share: 57 },
  },
];

const MOST_LAUNCHED = {
  name: "DZZ Mega Grand Challenge",
  game: "Lucky Spin",
  period: "29 Sep – 28 Oct 2026",
  started: "Started 29 Sep",
  ends: "Ends 15 Nov · 18 days left",
  progress: 62,
  stats: [
    { metric: "k1", icon: Users, value: "86", label: "Audience" },
    {
      metric: "k2",
      icon: MousePointerClick,
      value: "14,892",
      label: "Total clicks",
    },
    { metric: "k3", icon: CircleCheck, value: "49", label: "Conversions" },
  ] as { metric: Metric; icon: Icon; value: string; label: string }[],
};

const GAME_TYPES = {
  spin: { label: "Lucky Spin", metric: "k4", icon: FerrisWheel },
  quiz: { label: "Quiz", metric: "k2", icon: CircleHelp },
  scratch: { label: "Scratch card", metric: "k1", icon: Ticket },
  memory: { label: "Memory match", metric: "k3", icon: LayoutGrid },
} as const;
const STATUSES = {
  ending: { label: "Ending soon", tone: "warn", icon: TriangleAlert },
  live: { label: "Live", tone: "ok", icon: CircleCheck },
  scheduled: { label: "Scheduled", tone: "info", icon: Clock },
} as const;
const CAMPAIGNS: {
  name: string;
  game: keyof typeof GAME_TYPES;
  status: keyof typeof STATUSES;
  clicks: string;
  rate: string;
  bar: number;
  schedule: string;
}[] = [
  {
    name: "Autumn Gift Wheel",
    game: "spin",
    status: "ending",
    clicks: "142K",
    rate: "14.1%",
    bar: 70,
    schedule: "Ends 31 Oct",
  },
  {
    name: "Back to School Quiz",
    game: "quiz",
    status: "ending",
    clicks: "96K",
    rate: "12.8%",
    bar: 64,
    schedule: "Ends 31 Oct",
  },
  {
    name: "Weekend Scratch & Win",
    game: "scratch",
    status: "live",
    clicks: "71K",
    rate: "9.6%",
    bar: 48,
    schedule: "Ends 9 Nov",
  },
  {
    name: "Memory Match Rewards",
    game: "memory",
    status: "live",
    clicks: "44K",
    rate: "11.2%",
    bar: 56,
    schedule: "Ends 20 Nov",
  },
  {
    name: "Winter Gift Wheel",
    game: "spin",
    status: "scheduled",
    clicks: "—",
    rate: "—",
    bar: 0,
    schedule: "Starts 1 Dec",
  },
];

const CHANNELS = {
  total: "18,672",
  delta: "11%",
  rows: [
    {
      name: "Facebook link",
      share: "67%",
      value: 12458,
      delta: "156.4%",
      up: true,
    },
    {
      name: "Instagram link",
      share: "22%",
      value: 4128,
      delta: "3.3%",
      up: false,
    },
    {
      name: "Website link",
      share: "11%",
      value: 2086,
      delta: "24.2%",
      up: true,
    },
  ],
};

// Campaigns launched, by day and 3-hour block: 0 none, 1 one to four, 2 five or more.
const HEATMAP_HOURS = [
  "12 AM",
  "3 AM",
  "6 AM",
  "9 AM",
  "12 PM",
  "3 PM",
  "6 PM",
  "9 PM",
];
const HEATMAP_LEVELS = ["No campaigns", "1–4 campaigns", "5 or more campaigns"];
const HEATMAP: { day: string; levels: (0 | 1 | 2)[] }[] = [
  { day: "Sun", levels: [0, 0, 2, 0, 0, 2, 0, 0] },
  { day: "Mon", levels: [0, 0, 0, 2, 1, 0, 2, 0] },
  { day: "Tue", levels: [0, 1, 0, 0, 0, 0, 0, 0] },
  { day: "Wed", levels: [0, 0, 2, 0, 0, 0, 0, 1] },
  { day: "Thu", levels: [0, 1, 0, 0, 0, 2, 0, 0] },
  { day: "Fri", levels: [0, 0, 0, 0, 2, 0, 0, 0] },
  { day: "Sat", levels: [1, 0, 0, 2, 0, 2, 0, 0] },
];

const QUOTA = [
  {
    metric: "k1",
    icon: MousePointerClick,
    label: "Monthly clicks",
    share: "86%",
    value: "428K of 500K",
    progress: 86,
    bar: "warning",
  },
  {
    metric: "k2",
    icon: FerrisWheel,
    label: "Live campaigns",
    share: null,
    value: "4 of 10",
    progress: 40,
    bar: "teal",
  },
  {
    metric: "k4",
    icon: Users,
    label: "Team seats",
    share: null,
    value: "4 of 10",
    progress: 40,
    bar: "brand",
  },
] as const;

const ACTIVITY: {
  metric: Metric;
  icon: Icon;
  who: string;
  what: string;
  when: string;
}[] = [
  {
    metric: "k4",
    icon: Calendar,
    who: "Lina M.",
    what: "scheduled “Winter Gift Wheel” to start on 1 Dec",
    when: "2 h ago",
  },
  {
    metric: "k3",
    icon: Gift,
    who: "Free coffee voucher",
    what: "reached 90% of its stock",
    when: "5 h ago",
  },
  {
    metric: "k1",
    icon: UserPlus,
    who: "Amine K.",
    what: "accepted your invitation as Editor",
    when: "Yesterday",
  },
  {
    metric: "k2",
    icon: FileText,
    who: "Weekly executive PDF",
    what: "was sent to 3 recipients",
    when: "Sun, 6:00 AM",
  },
  {
    metric: "k4",
    icon: Pencil,
    who: "Lina M.",
    what: "updated the rewards of “Weekend Scratch & Win”",
    when: "3 days ago",
  },
  {
    metric: "k1",
    icon: CircleCheck,
    who: "DZZ Mega Grand Challenge",
    what: "passed 14,000 clicks",
    when: "4 days ago",
  },
];

// ── Small parts ──────────────────────────────────────────────────────────────

const ICON = {
  size: 18,
  strokeWidth: 1.75,
  className: "dz-icon",
  "aria-hidden": true,
} as const;
const BADGE_ICON = { ...ICON, size: 14 } as const;

function Delta({
  value,
  up = true,
  small = true,
}: {
  value: string;
  up?: boolean;
  small?: boolean;
}) {
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`ov-badge ${small ? "ov-badge-sm" : ""} ${up ? "ov-ok" : "ov-bad"}`}
    >
      <Arrow {...BADGE_ICON} />
      <span className="sr-only">{up ? "Up" : "Down"} </span>
      {value}
    </span>
  );
}

function LinkButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="ov-link" onClick={onClick}>
      {label}
      <ArrowRight {...BADGE_ICON} />
    </button>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const width = 96;
  const height = 40;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 2 - ((value - min) / (max - min || 1)) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
    >
      <path
        d={`${line} L${width},${height} L0,${height} Z`}
        fill="var(--k-fill)"
        opacity={0.14}
      />
      <path
        d={line}
        fill="none"
        stroke="var(--k-fill)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Ring({ share }: { share: number }) {
  const radius = 19.5;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      viewBox="0 0 44 44"
      width={44}
      height={44}
      aria-hidden
      style={{ display: "block", marginInlineStart: "auto" }}
    >
      <circle
        cx={22}
        cy={22}
        r={radius}
        fill="none"
        stroke="var(--surface-hover)"
        strokeWidth={5}
      />
      <circle
        cx={22}
        cy={22}
        r={radius}
        fill="none"
        stroke="var(--k-fill)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={`${(share / 100) * circumference} ${circumference}`}
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

// ── The page ─────────────────────────────────────────────────────────────────

export interface OverviewPageProps {
  onNewCampaign?: () => void;
  onOpenAnalytics?: () => void;
  onOpenCampaigns?: () => void;
  onOpenRewards?: () => void;
  onOpenBilling?: () => void;
  onOpenAccount?: () => void;
}

export function OverviewPage({
  onNewCampaign,
  onOpenAnalytics,
  onOpenCampaigns,
  onOpenRewards,
  onOpenBilling,
  onOpenAccount,
}: OverviewPageProps) {
  const { theme } = useTheme();
  const [attentionOpen, setAttentionOpen] = useState(true);
  const [series, setSeries] = useState<SeriesKey>("clicks");
  const chart = CHART_SERIES[series];
  const peakIndex = chart.values.indexOf(Math.max(...chart.values));
  const attentionActions = [onOpenCampaigns, onOpenRewards, onOpenAccount];
  const channelTotal = CHANNELS.rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div
      className="ov-root dz-theme"
      data-theme={theme === "dark" ? "dark" : "light"}
    >
      {/* 1. Page header */}
      <header className="ov-page-head">
        <div>
          <h1>Overview</h1>
          <p className="ov-sub">
            Campaign and reward performance, compared with the previous 30 days.
          </p>
        </div>
        <div className="ov-actions">
          <button type="button" className="ov-btn">
            <Calendar {...ICON} />
            Last 30 days
            <span className="ov-btn-light dz-num">29 Sep – 28 Oct 2026</span>
            <ChevronDown {...BADGE_ICON} />
          </button>
          <button type="button" className="ov-btn">
            <Download {...ICON} />
            Export
          </button>
          <button
            type="button"
            className="ov-btn ov-btn-primary"
            onClick={onNewCampaign}
          >
            <Plus {...ICON} />
            New campaign
          </button>
        </div>
      </header>

      {/* 2. Needs your attention */}
      <section
        className="ov-card ov-attention"
        aria-labelledby="ov-attention-title"
      >
        <div className="ov-attention-head">
          <span aria-hidden className="ov-red-dot" />
          <h2 id="ov-attention-title" className="ov-title">
            Needs your attention
          </h2>
          <span className="ov-badge ov-badge-sm ov-bad">1 urgent</span>
          <span className="ov-badge ov-badge-sm ov-warn">2 to review</span>
          <span className="ov-spacer" />
          <span className="ov-caption">
            Resolve these to keep campaigns running
          </span>
          <button
            type="button"
            className="ov-btn ov-btn-sm"
            aria-expanded={attentionOpen}
            aria-controls="ov-attention-body"
            onClick={() => setAttentionOpen((open) => !open)}
          >
            {attentionOpen ? "Collapse" : "Expand"}
            {attentionOpen ? (
              <ChevronUp {...BADGE_ICON} />
            ) : (
              <ChevronDown {...BADGE_ICON} />
            )}
          </button>
        </div>
        {attentionOpen && (
          <div id="ov-attention-body" className="ov-attention-body">
            {ATTENTION_ITEMS.map((item, index) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`ov-attention-cell t-${item.tone}`}
                >
                  <span aria-hidden className="ov-tile ov-tile-lg">
                    <ItemIcon {...ICON} />
                  </span>
                  <div className="ov-attention-main">
                    <div className="ov-attention-title">
                      <h3>{item.title}</h3>
                      <span
                        className={`ov-badge ov-badge-sm ov-${item.badge.tone}`}
                      >
                        {item.badge.label}
                      </span>
                    </div>
                    <p className="ov-sub">{item.description}</p>
                    <p className="ov-when ov-caption dz-num">
                      <Clock {...BADGE_ICON} />
                      {item.when}
                    </p>
                    <div className="ov-attention-foot">
                      <div>
                        <progress
                          className={`ov-progress ${item.progressTone === "brand" ? "" : `ov-progress-${item.progressTone}`}`}
                          value={item.progress}
                          max={100}
                          aria-label={item.caption}
                        />
                        <span className="ov-caption dz-num">
                          {item.caption}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ov-btn ov-btn-sm"
                        onClick={attentionActions[index]}
                      >
                        {item.action}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. KPI row: always four across */}
      <section className="ov-kpis" aria-label="Key figures">
        <div className="ov-kpi-grid">
          {KPIS.map((kpi) => {
            const KpiIcon = kpi.icon;
            return (
              <article
                key={kpi.label}
                className={`ov-card ov-kpi ${kpi.metric}`}
              >
                <div className="ov-kpi-top">
                  <span aria-hidden className="ov-tile">
                    <KpiIcon {...ICON} />
                  </span>
                  <h3 className="ov-kpi-label">{kpi.label}</h3>
                  <Delta value={kpi.delta} />
                </div>
                <div className="ov-kpi-bottom">
                  <div>
                    <p className="ov-kpi-value">{kpi.value}</p>
                    <p className="ov-caption dz-num">{kpi.caption}</p>
                  </div>
                  <div className="ov-kpi-visual">
                    {kpi.visual.kind === "spark" && (
                      <Sparkline
                        values={CHART_SERIES[kpi.visual.series].values}
                      />
                    )}
                    {kpi.visual.kind === "split" && (
                      <>
                        <p className="ov-caption dz-num">
                          <span
                            style={{ color: "var(--k-text)", fontWeight: 600 }}
                          >
                            {kpi.visual.label}
                          </span>{" "}
                          redeemed
                        </p>
                        <div className="ov-split" aria-hidden>
                          <span style={{ width: `${kpi.visual.share}%` }} />
                        </div>
                        <p
                          className="ov-caption dz-num"
                          style={{ textAlign: "right" }}
                        >
                          {kpi.visual.detail}
                        </p>
                      </>
                    )}
                    {kpi.visual.kind === "ring" && (
                      <Ring share={kpi.visual.share} />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 4. Performance + most launched campaign */}
      <div className="ov-row">
        <section
          className={`ov-card ov-wide ov-col ${chart.color}`}
          aria-labelledby="ov-performance"
        >
          <div className="ov-head">
            <div>
              <h2 id="ov-performance" className="ov-title">
                Performance
              </h2>
              <p className="ov-sub">Daily totals for the last 30 days</p>
            </div>
            <div className="ov-segmented" role="tablist" aria-label="Metric">
              {(Object.keys(CHART_SERIES) as SeriesKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={series === key}
                  aria-controls="ov-performance-chart"
                  onClick={() => setSeries(key)}
                >
                  {CHART_SERIES[key].tab}
                </button>
              ))}
            </div>
          </div>
          <div className="ov-head" style={{ alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span className="ov-big">{chart.total}</span>
              <Delta value={chart.delta} />
              <span className="ov-sub dz-num">{chart.previous}</span>
            </div>
            <div className="ov-legend ov-caption">
              <span>
                <span aria-hidden className="ov-swatch" />
                This period
              </span>
              <span>
                <span aria-hidden className="ov-dash" />
                Previous period
              </span>
            </div>
          </div>
          <div
            id="ov-performance-chart"
            className="ov-chart"
            role="tabpanel"
            aria-label={`${chart.tab}, daily`}
          >
            <div className="ov-yaxis ov-caption dz-num" aria-hidden>
              {chart.ticks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
            <div
              className="ov-plot"
              role="img"
              aria-label={`${chart.tab}: ${chart.total} in 30 days, peak ${chart.peak}`}
            >
              {chart.values.map((value, index) => (
                <span
                  key={index}
                  data-peak={index === peakIndex ? "" : undefined}
                  style={{ height: `${(value / chart.top) * 100}%` }}
                />
              ))}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <polyline
                  fill="none"
                  stroke="var(--ink-subtle)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                  points={chart.values
                    .map((value, index) => {
                      const x = ((index + 0.5) / chart.values.length) * 100;
                      const y =
                        100 - ((value * PREVIOUS_RATIO) / chart.top) * 100;
                      return `${x.toFixed(2)},${y.toFixed(2)}`;
                    })
                    .join(" ")}
                />
              </svg>
            </div>
            <div className="ov-xaxis ov-caption" aria-hidden>
              {X_LABELS.map((label) => (
                <span
                  key={label.label}
                  style={{ gridColumn: `${label.day + 1} / span 7` }}
                >
                  {label.label}
                </span>
              ))}
            </div>
          </div>
          <div className="ov-footer">
            <span className="ov-legend ov-caption">
              <span>
                <span
                  aria-hidden
                  className="ov-swatch"
                  style={{ background: "var(--peak)" }}
                />
                Peak day
                <span className="ov-strong dz-num">{chart.peak}</span>
              </span>
            </span>
            <LinkButton label="View full analytics" onClick={onOpenAnalytics} />
          </div>
        </section>

        <section
          className="ov-card ov-narrow ov-col ov-launched"
          aria-labelledby="ov-launched"
        >
          <div className="ov-head">
            <div>
              <h2 id="ov-launched" className="ov-title">
                Most launched campaign
              </h2>
              <p className="ov-sub dz-num">{MOST_LAUNCHED.period}</p>
            </div>
            <button type="button" className="ov-btn ov-btn-sm">
              All channels
              <ChevronDown {...BADGE_ICON} />
            </button>
          </div>
          <div className="ov-highlight">
            <span aria-hidden className="ov-tile ov-tile-lg ov-tile-white">
              <FerrisWheel {...ICON} />
            </span>
            <div>
              <p style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700 }}>
                {MOST_LAUNCHED.name}
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <span className="ov-chip">{MOST_LAUNCHED.game}</span>
                <span className="ov-badge ov-badge-sm ov-ok">
                  <CircleCheck {...BADGE_ICON} />
                  Live
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span className="ov-caption dz-num">{MOST_LAUNCHED.started}</span>
              <span className="ov-caption dz-num">{MOST_LAUNCHED.ends}</span>
            </div>
            <progress
              className="ov-progress ov-progress-violet"
              value={MOST_LAUNCHED.progress}
              max={100}
              aria-label={`Runtime ${MOST_LAUNCHED.progress}% elapsed`}
            />
          </div>
          <div className="ov-mini-stats">
            {MOST_LAUNCHED.stats.map((stat) => {
              const StatIcon = stat.icon;
              return (
                <div key={stat.label} className={stat.metric}>
                  <span aria-hidden className="ov-tile ov-tile-sm">
                    <StatIcon {...BADGE_ICON} />
                  </span>
                  <span className="ov-mini-value">{stat.value}</span>
                  <span className="ov-caption">{stat.label}</span>
                </div>
              );
            })}
          </div>
          <div className="ov-footer" style={{ borderTop: 0, paddingTop: 0 }}>
            <LinkButton
              label="See campaign details"
              onClick={onOpenCampaigns}
            />
          </div>
        </section>
      </div>

      {/* 5. Campaigns table + clicks by tracked link */}
      <div className="ov-row">
        <section
          className="ov-card ov-wide ov-col"
          aria-labelledby="ov-campaigns"
        >
          <div className="ov-head">
            <div>
              <h2 id="ov-campaigns" className="ov-title">
                Campaigns
              </h2>
              <p className="ov-sub">Sorted by clicks in the last 30 days</p>
            </div>
            <LinkButton label="View all campaigns" onClick={onOpenCampaigns} />
          </div>
          <div className="ov-scroll">
            <div
              className="ov-table"
              role="table"
              aria-labelledby="ov-campaigns"
            >
              <div className="ov-tr ov-th" role="row">
                <span role="columnheader">Campaign</span>
                <span role="columnheader">Status</span>
                <span role="columnheader" className="ov-right">
                  Clicks
                </span>
                <span role="columnheader">Conversion rate</span>
                <span role="columnheader">Schedule</span>
              </div>
              {CAMPAIGNS.map((campaign) => {
                const game = GAME_TYPES[campaign.game];
                const status = STATUSES[campaign.status];
                const GameIcon = game.icon;
                const StatusIcon = status.icon;
                return (
                  <div key={campaign.name} className="ov-tr" role="row">
                    <span role="cell" className={`ov-name ${game.metric}`}>
                      <span aria-hidden className="ov-tile ov-tile-30">
                        <GameIcon {...ICON} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span
                          className="ov-strong"
                          style={{ display: "block", fontWeight: 600 }}
                        >
                          {campaign.name}
                        </span>
                        <span className="ov-caption">{game.label}</span>
                      </span>
                    </span>
                    <span role="cell">
                      <span
                        className={`ov-badge ov-badge-sm ov-${status.tone}`}
                      >
                        <StatusIcon {...BADGE_ICON} />
                        {status.label}
                      </span>
                    </span>
                    <span role="cell" className="ov-right ov-strong dz-num">
                      {campaign.clicks}
                    </span>
                    <span role="cell" className="ov-rate">
                      <strong className="dz-num">{campaign.rate}</strong>
                      <progress
                        className="ov-progress ov-progress-teal"
                        value={campaign.bar}
                        max={100}
                        aria-label={`Conversion rate ${campaign.rate}`}
                      />
                    </span>
                    <span role="cell" className="ov-sub dz-num">
                      {campaign.schedule}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          className="ov-card ov-narrow ov-col"
          aria-labelledby="ov-channels"
        >
          <div>
            <h2 id="ov-channels" className="ov-title">
              Clicks by tracked link
            </h2>
            <p className="ov-sub">Where your players come from</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ov-big">{CHANNELS.total}</span>
            <Delta value={CHANNELS.delta} />
          </div>
          <div className="ov-segments" aria-hidden>
            {CHANNELS.rows.map((row) => (
              <span key={row.name} style={{ flex: row.value / channelTotal }} />
            ))}
          </div>
          <div>
            {CHANNELS.rows.map((row, index) => (
              <div key={row.name} className="ov-source">
                <span
                  aria-hidden
                  className={`ov-square ov-square-${index + 1}`}
                />
                <span style={{ fontWeight: 600 }}>{row.name}</span>
                <span className="ov-sub dz-num">{row.share}</span>
                <span className="ov-strong dz-num">
                  {row.value.toLocaleString("en-US")}
                </span>
                <Delta value={row.delta} up={row.up} />
              </div>
            ))}
          </div>
          <div className="ov-footer" style={{ borderTop: 0, paddingTop: 0 }}>
            <LinkButton label="Manage tracked links" />
          </div>
        </section>
      </div>

      {/* 6. When campaigns launch + plan & quota */}
      <div className="ov-row">
        <section
          className="ov-card ov-wide ov-col"
          aria-labelledby="ov-launches"
        >
          <div className="ov-head">
            <div>
              <h2 id="ov-launches" className="ov-title">
                When campaigns launch
              </h2>
              <p className="ov-sub">
                Campaigns launched by day and time, in 3-hour blocks
              </p>
            </div>
            <div className="ov-heat-legend ov-caption">
              <span>
                <span aria-hidden className="ov-heat-cell" data-level={0} />
                None
              </span>
              <span>
                <span aria-hidden className="ov-heat-cell" data-level={1} />
                1–4
              </span>
              <span>
                <span aria-hidden className="ov-heat-cell" data-level={2} />5 or
                more
              </span>
            </div>
          </div>
          <div className="ov-scroll">
            <div className="ov-heat" role="grid" aria-labelledby="ov-launches">
              <span role="row" style={{ display: "contents" }}>
                <span />
                {HEATMAP_HOURS.map((hour) => (
                  <span
                    key={hour}
                    role="columnheader"
                    className="ov-caption"
                    style={{ textAlign: "center" }}
                  >
                    {hour}
                  </span>
                ))}
              </span>
              {HEATMAP.map((row) => (
                <span key={row.day} role="row" style={{ display: "contents" }}>
                  <span role="rowheader" className="ov-heat-day">
                    {row.day}
                  </span>
                  {row.levels.map((level, index) => {
                    const label = `${row.day} ${HEATMAP_HOURS[index]}: ${HEATMAP_LEVELS[level]}`;
                    return (
                      <span
                        key={index}
                        role="gridcell"
                        className="ov-heat-cell"
                        data-level={level}
                        title={label}
                        aria-label={label}
                      />
                    );
                  })}
                </span>
              ))}
            </div>
          </div>
          <div className="ov-footer">
            <span className="ov-when ov-sub">
              <Info {...ICON} />
              Most launches happen on weekends, at 6 AM and 3 PM.
            </span>
          </div>
        </section>

        <section
          className="ov-card ov-narrow ov-col"
          aria-labelledby="ov-quota"
        >
          <div className="ov-head">
            <div>
              <h2 id="ov-quota" className="ov-title">
                Plan & quota
              </h2>
              <p className="ov-sub">Business plan · resets 1 Nov</p>
            </div>
            <span className="ov-badge ov-badge-sm ov-warn">
              <TriangleAlert {...BADGE_ICON} />
              Near limit
            </span>
          </div>
          {QUOTA.map((row) => {
            const RowIcon = row.icon;
            return (
              <div key={row.label} className={`ov-quota ${row.metric}`}>
                <div>
                  <span aria-hidden className="ov-tile">
                    <RowIcon {...ICON} />
                  </span>
                  <span style={{ fontWeight: 600, flex: "1 1 auto" }}>
                    {row.label}
                  </span>
                  <span
                    className="ov-caption dz-num"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {row.share && (
                      <>
                        <strong style={{ color: "var(--warning)" }}>
                          {row.share}
                        </strong>{" "}
                        ·{" "}
                      </>
                    )}
                    {row.value}
                  </span>
                </div>
                <progress
                  className={`ov-progress ${row.bar === "brand" ? "" : `ov-progress-${row.bar}`}`}
                  value={row.progress}
                  max={100}
                  aria-label={`${row.label}: ${row.share ? `${row.share}, ` : ""}${row.value}`}
                />
              </div>
            );
          })}
          <div className="ov-footer">
            <LinkButton label="Set alert thresholds" />
            <button
              type="button"
              className="ov-btn ov-btn-sm"
              onClick={onOpenBilling}
            >
              Manage plan
            </button>
          </div>
        </section>
      </div>

      {/* 7. Recent activity */}
      <section className="ov-card ov-activity" aria-labelledby="ov-activity">
        <div className="ov-head">
          <div>
            <h2 id="ov-activity" className="ov-title">
              Recent activity
            </h2>
            <p className="ov-sub">
              Changes made by your team and automatic alerts
            </p>
          </div>
          <LinkButton label="View audit log" />
        </div>
        <ul className="ov-activity-list">
          {ACTIVITY.map((entry) => {
            const EntryIcon = entry.icon;
            return (
              <li key={`${entry.who}-${entry.when}`} className={entry.metric}>
                <span aria-hidden className="ov-tile">
                  <EntryIcon {...ICON} />
                </span>
                <p className="ov-activity-text">
                  <strong>{entry.who}</strong> {entry.what}
                </p>
                <span
                  className="ov-caption dz-num"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {entry.when}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
