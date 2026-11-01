import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  CircleCheck,
  Clock,
  Flag,
  Plus,
  Ticket,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { useDashboard } from "../../dashboard/DashboardContext";
import { useOnboarding } from "../../dashboard/onboarding/OnboardingContext";
import { PATHS } from "../../dashboard/paths";
import { useTheme } from "../../contexts/ThemeContext";
import {
  useActivityFeed,
  useOverviewSnapshot,
} from "../../hooks/useOverviewData";
import type { ActivityEntry, Campaign, PrizeTemplate } from "../../types";
import { useExperienceSummaries } from "../playerStudio/useExperienceSummaries";
import { GameEmblem } from "../campaigns/GameEmblem";
import { ErrorState, GhostChart } from "../ui/EmptyState";
import { CampaignTimeline } from "./CampaignTimeline";
import { OverviewHelp } from "./OverviewHelp";
import {
  ACTIVITY_FETCHED,
  ACTIVITY_FILTERS,
  ACTIVITY_LIMIT,
  GAME_LIST,
  GAME_TYPES,
  PERFORMANCE_RANGES,
  clockTime,
  shortDate,
  type Accent,
  type ActivityFilter,
  type RangeKey,
} from "./overviewData";
import {
  LOW_STOCK_SHARE,
  LOW_STOCK_UNITS,
  absoluteTime,
  campaignSummary,
  countdown,
  initialsOf,
  lowRewards,
  performanceFigures,
  relativeTime,
} from "./overviewMetrics";
import {
  Delta,
  FilterChips,
  ICON,
  SMALL_ICON,
  Segmented,
  Sparkline,
  TextLink,
} from "./overviewParts";
import { SetupSection } from "./SetupSection";
import { deriveSetupSteps } from "./setupSteps";
import "./overview.css";

// The Overview page of the console: the account's real campaigns, rewards, participations and
// team activity. Each block shows its data or its own empty form, on its own, and an empty form
// only ever follows a successful load.

// ── Header ───────────────────────────────────────────────────────────────────

function NewCampaignButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector("a")?.focus();
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  const onMenuKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
      toggleRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll("a") ?? [])];
    const step = event.key === "ArrowDown" ? 1 : -1;
    const index = items.indexOf(document.activeElement as HTMLAnchorElement);
    items[(index + step + items.length) % items.length]?.focus();
  };

  return (
    <div ref={rootRef} className="ov-split-btn" data-tour="new-campaign">
      <Link to={PATHS.create} className="ov-btn ov-btn-primary">
        <Plus {...ICON} />
        New campaign
      </Link>
      <button
        ref={toggleRef}
        type="button"
        className="ov-btn ov-btn-primary"
        aria-label="Choose a game type"
        title="Choose a game type"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <ChevronDown {...SMALL_ICON} />
      </button>
      {menuOpen && (
        <div className="ov-menu" onKeyDown={onMenuKey}>
          <p id="ov-menu-title" className="ov-eyebrow">
            Start from a game type
          </p>
          <div ref={menuRef} role="menu" aria-labelledby="ov-menu-title">
            {GAME_LIST.map((game) => {
              return (
                <Link
                  key={game.id}
                  to={PATHS.create}
                  state={{ gameType: game.id }}
                  role="menuitem"
                  className="ov-menu-item"
                >
                  <GameEmblem gameType={game.id} size={36} />
                  <span>
                    <strong>{game.label}</strong>
                    <span className="ov-caption">{game.caption}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const TODAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function PageHeader() {
  return (
    <header className="ov-page-head">
      <div>
        <h1>Overview</h1>
        <p className="ov-sub">{TODAY_FORMAT.format(new Date())}</p>
      </div>
      <NewCampaignButton />
    </header>
  );
}

// ── Summary cards ────────────────────────────────────────────────────────────

function EmptySummaryCard({
  accent,
  icon: Icon,
  title,
  message,
  action,
  to,
  state,
}: {
  accent: string;
  icon: LucideIcon;
  title: string;
  message: string;
  action: string;
  to: string;
  state?: unknown;
}) {
  const id = `ov-sum-${accent}`;
  return (
    <section className={`ov-card ov-sum ${accent}`} aria-labelledby={id}>
      <div className="ov-sum-head">
        <span aria-hidden className="ov-tile">
          <Icon {...ICON} />
        </span>
        <h2 id={id} className="ov-eyebrow">
          {title}
        </h2>
      </div>
      <div className="ov-sum-empty">
        <p className="ov-sub">{message}</p>
        <Link to={to} state={state} className="ov-btn ov-btn-sm">
          {action}
        </Link>
      </div>
    </section>
  );
}

function ActiveCard({
  live,
  endingNext,
  paused,
  archived,
  now,
}: {
  live: number;
  endingNext: Campaign | null;
  paused: number;
  archived: number;
  now: number;
}) {
  const noun = live === 1 ? "campaign" : "campaigns";
  return (
    <section className="ov-card ov-sum k1" aria-labelledby="ov-sum-active">
      <Link
        to={PATHS.campaigns}
        className="ov-card-link"
        aria-label={`Active now: ${live} ${noun} live. Open campaigns list`}
      />
      <div className="ov-sum-head">
        <span aria-hidden className="ov-tile">
          <Flag {...ICON} />
        </span>
        <h2 id="ov-sum-active" className="ov-eyebrow">
          Active now
        </h2>
        <span className="ov-live">
          <span aria-hidden />
          Live
        </span>
      </div>
      <p className="ov-metric">
        <strong>{live}</strong>
        <span>{noun} live</span>
      </p>
      {endingNext ? (
        <p className="ov-sum-context ov-text-bad ov-semibold">
          <Clock {...SMALL_ICON} />
          {endingNext.name} ends in{" "}
          {countdown(Date.parse(endingNext.endDate) - now)}
        </p>
      ) : (
        <p className="ov-sum-context ov-text-muted">
          No campaign ending in the next 3 days
        </p>
      )}
      <div className="ov-sum-visual">
        <div className="ov-stack" aria-hidden>
          <span style={{ flex: live }} />
          <span style={{ flex: paused }} />
          <span style={{ flex: archived }} />
        </div>
        <div className="ov-legend">
          <span>
            <span aria-hidden className="ov-dot ov-dot-1" />
            {live} active
          </span>
          <span>
            <span aria-hidden className="ov-dot ov-dot-2" />
            {paused} paused
          </span>
          <span>
            <span aria-hidden className="ov-dot ov-dot-3" />
            {archived} archived
          </span>
        </div>
      </div>
      <div className="ov-footer">
        <TextLink to={PATHS.campaigns} label="View all campaigns" />
      </div>
    </section>
  );
}

function UpNextCard({
  scheduled,
  now,
}: {
  scheduled: Campaign[];
  now: number;
}) {
  const next = scheduled[0];
  const start = Date.parse(next.startDate);
  const left = countdown(start - now);
  const others = scheduled.slice(1);
  return (
    <section className="ov-card ov-sum k4" aria-labelledby="ov-sum-next">
      <Link
        to={PATHS.campaign(next.id)}
        className="ov-card-link"
        aria-label={`Up next: ${next.name} starts in ${left}. Open the campaign`}
      />
      <div className="ov-sum-head">
        <span aria-hidden className="ov-tile">
          <Calendar {...ICON} />
        </span>
        <h2 id="ov-sum-next" className="ov-eyebrow">
          Up next
        </h2>
      </div>
      <p className="ov-metric">
        <strong className="ov-text-accent">{left}</strong>
        <span>until launch</span>
      </p>
      <p className="ov-sum-context ov-text-muted">
        <strong className="ov-strong" dir="auto">
          {next.name}
        </strong>
        · {shortDate(start)}, {clockTime(start)}
      </p>
      <div className="ov-sum-visual">
        <div className="ov-sum-chips">
          <span className="ov-chip">{GAME_TYPES[next.gameType].label}</span>
          {next.prizes.length > 0 ? (
            <span className="ov-badge ov-badge-sm ov-ok">
              <CircleCheck {...SMALL_ICON} />
              Prize set
            </span>
          ) : (
            <span className="ov-badge ov-badge-sm ov-warn">
              <TriangleAlert {...SMALL_ICON} />
              No prize yet
            </span>
          )}
        </div>
        {others.length > 0 && (
          <p className="ov-caption">
            {others.length} more scheduled: {others[0].name} ·{" "}
            {shortDate(Date.parse(others[0].startDate))}
          </p>
        )}
      </div>
      <div className="ov-footer">
        <TextLink to={PATHS.campaigns} label="Open schedule" />
        <Link to={PATHS.edit(next.id)} className="ov-btn ov-btn-sm">
          Edit
        </Link>
      </div>
    </section>
  );
}

function VouchersCard({ prizes }: { prizes: PrizeTemplate[] }) {
  const low = lowRewards(prizes);
  const hasLow = low.length > 0;
  return (
    <section
      className={`ov-card ov-sum ${hasLow ? "t-danger" : "k2"}`}
      aria-labelledby="ov-sum-vouchers"
    >
      <Link
        to={PATHS.prizesLocal}
        className="ov-card-link"
        aria-label={
          hasLow
            ? `Vouchers: ${low.length} running low. Open your rewards`
            : `Vouchers: ${prizes.length} rewards in stock. Open your rewards`
        }
      />
      <div className="ov-sum-head">
        <span aria-hidden className="ov-tile">
          <Ticket {...ICON} />
        </span>
        <h2 id="ov-sum-vouchers" className="ov-eyebrow">
          Vouchers
        </h2>
      </div>
      <p className="ov-metric">
        <strong className={hasLow ? "ov-text-bad" : undefined}>
          {hasLow ? low.length : prizes.length}
        </strong>
        <span>
          {hasLow
            ? "running low"
            : prizes.length === 1
              ? "reward in stock"
              : "rewards in stock"}
        </span>
      </p>
      <p className="ov-sum-context ov-text-muted">
        {hasLow
          ? `Critical: under ${LOW_STOCK_UNITS} units or under ${LOW_STOCK_SHARE * 100}% of stock`
          : "All your rewards are well stocked"}
      </p>
      {hasLow && (
        <div className="ov-sum-visual ov-vouchers">
          {low.slice(0, 2).map((reward) => (
            <div key={reward.id}>
              <p>
                <span dir="auto">{reward.name}</span>
                <strong className="dz-num" data-tone={reward.tone}>
                  {reward.left} left
                </strong>
              </p>
              <progress
                className={`ov-progress ov-progress-${reward.tone}`}
                value={reward.share * 100}
                max={100}
                aria-label={`${reward.name}: ${reward.left} left of ${reward.total}`}
              />
            </div>
          ))}
        </div>
      )}
      <div className="ov-footer">
        <TextLink to={PATHS.prizesLocal} label="View full inventory" />
      </div>
    </section>
  );
}

// ── Performance snapshot ─────────────────────────────────────────────────────

function PerformanceSnapshot({ orgId }: { orgId: string | null }) {
  const [perfRange, setPerfRange] = useState<RangeKey>("7d");
  const { days } = PERFORMANCE_RANGES[perfRange];
  const { data, loading, error, refetch } = useOverviewSnapshot(orgId, days);
  const figures = useMemo(
    () => (data ? performanceFigures(data) : null),
    [data],
  );
  const versus = `vs previous ${days} days`;

  if (error) {
    return (
      <section className="ov-card ov-perf">
        <ErrorState
          variant="inline"
          title="Your performance could not be loaded"
          onRetry={() => void refetch()}
        />
      </section>
    );
  }
  if (!data || !figures) {
    return loading ? (
      <section className="ov-card ov-perf" aria-busy="true">
        <span className="ov-sk" style={{ display: "block", height: 148 }} />
      </section>
    ) : null;
  }
  if (data.totalParticipants === 0) {
    return (
      <section
        className="ov-card ov-perf"
        aria-labelledby="ov-performance-title"
      >
        <div className="ov-ghost">
          <h2 id="ov-performance-title" className="ov-title">
            Performance snapshot
          </h2>
          <GhostChart label="Sample data" />
          <p className="ov-sub">
            Your metrics will appear here once players start participating.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ov-card ov-perf" aria-labelledby="ov-performance-title">
      <div className="ov-perf-head">
        <div>
          <h2 id="ov-performance-title" className="ov-title">
            Performance snapshot
          </h2>
          <p className="ov-sub">
            Last {days} days, compared with the previous {days} days
          </p>
        </div>
        <div className="ov-perf-actions">
          <Segmented
            label="Performance period"
            value={perfRange}
            options={(["7d", "30d"] as const).map((key) => ({
              key,
              label: PERFORMANCE_RANGES[key].tab,
            }))}
            onChange={setPerfRange}
          />
          <TextLink to={PATHS.analytics} label="Open analytics" />
        </div>
      </div>
      <div className="ov-perf-body">
        <div className="ov-stat k1">
          <div className="ov-stat-main">
            <p className="ov-stat-label">Participants</p>
            <p className="ov-stat-value">{figures.participants}</p>
            <p className="ov-stat-delta">
              {figures.participantsChange ? (
                <>
                  <Delta {...figures.participantsChange} />
                  <span className="ov-caption">{versus}</span>
                </>
              ) : (
                <span className="ov-caption">No earlier period to compare</span>
              )}
            </p>
          </div>
          <Sparkline
            values={figures.trend}
            label={`Participation trend over the last ${days} days`}
          />
        </div>
        <div className="ov-stat k3">
          <div className="ov-stat-main">
            <p className="ov-stat-label">Rewards claimed</p>
            <p className="ov-stat-value">
              {figures.claimed}
              <span> of {figures.available} available</span>
            </p>
            <progress
              className="ov-progress ov-progress-warning"
              value={figures.claimedShare}
              max={100}
              aria-label={`Rewards claimed: ${figures.claimedShare}%`}
            />
            <p className="ov-caption dz-num">{figures.claimedShare}% claimed</p>
          </div>
        </div>
        <div className="ov-stat k2">
          <div className="ov-stat-main">
            <p className="ov-stat-label">Redemption rate</p>
            <p className="ov-stat-value">{figures.redemption}</p>
            <p className="ov-stat-delta">
              {figures.redemptionChange ? (
                <>
                  <Delta {...figures.redemptionChange} />
                  <span className="ov-caption">{versus}</span>
                </>
              ) : (
                <span className="ov-caption">No earlier period to compare</span>
              )}
            </p>
            <p className="ov-caption">of handed-out rewards were redeemed</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Team activity ────────────────────────────────────────────────────────────

const ACTIVITY_ACCENTS: Record<ActivityEntry["category"], Accent> = {
  campaign: "k4",
  reward: "k2",
  team: "k1",
};

const activityLink = (entry: ActivityEntry) =>
  entry.category === "team"
    ? PATHS.accountTeam
    : entry.category === "reward"
      ? PATHS.prizesLocal
      : entry.objectId
        ? PATHS.campaign(entry.objectId)
        : PATHS.campaigns;

function TeamActivity({ orgId }: { orgId: string | null }) {
  const [actFilter, setActFilter] = useState<ActivityFilter>("all");
  const { data, loading, error, refetch } = useActivityFeed(
    orgId,
    ACTIVITY_FETCHED,
  );
  const now = Date.now();
  const rows = (data ?? [])
    .filter((row) => actFilter === "all" || row.category === actFilter)
    .slice(0, ACTIVITY_LIMIT);

  return (
    <section
      className="ov-card ov-activity"
      aria-labelledby="ov-activity-title"
    >
      <h2 id="ov-activity-title" className="ov-title">
        Team activity
      </h2>
      <FilterChips
        label="Filter activity"
        value={actFilter}
        options={ACTIVITY_FILTERS}
        onChange={setActFilter}
      />
      {error ? (
        <ErrorState
          variant="inline"
          title="Team activity could not be loaded"
          onRetry={() => void refetch()}
        />
      ) : loading && !data ? (
        <span className="ov-sk" style={{ display: "block", height: 120 }} />
      ) : rows.length === 0 ? (
        <p className="ov-tl-none">No activity to show here yet.</p>
      ) : (
        <ul className="ov-activity-list">
          {rows.map((row) => {
            const time = Date.parse(row.createdAt);
            return (
              <li key={row.id} className={ACTIVITY_ACCENTS[row.category]}>
                <span aria-hidden className="ov-avatar">
                  {initialsOf(row.actorName)}
                </span>
                <div>
                  <p className="ov-sub">
                    <strong dir="auto">{row.actorName}</strong> {row.verb}{" "}
                    <Link to={activityLink(row)} dir="auto">
                      {row.objectName}
                    </Link>
                  </p>
                  {row.detail && (
                    <p className="ov-activity-detail">
                      <ArrowRight {...SMALL_ICON} />
                      {row.detail}
                    </p>
                  )}
                  <p className="ov-caption dz-num">
                    {relativeTime(time, now)} ·{" "}
                    <span title={absoluteTime(time)}>{absoluteTime(time)}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── States ───────────────────────────────────────────────────────────────────

const Skeleton = ({ width, height }: { width?: number; height: number }) => (
  <span className="ov-sk" style={{ width, height }} />
);

function LoadingState() {
  return (
    <div
      className="ov-loading"
      role="status"
      aria-busy="true"
      aria-label="Loading overview"
    >
      <div className="ov-page-head">
        <div className="ov-sk-stack">
          <Skeleton width={260} height={26} />
          <Skeleton width={140} height={14} />
        </div>
        <Skeleton width={150} height={36} />
      </div>
      <div className="ov-card ov-sk-row">
        <Skeleton height={70} />
        <Skeleton height={70} />
        <Skeleton height={70} />
      </div>
      <div className="ov-sk-row">
        {[0, 1, 2].map((card) => (
          <div key={card} className="ov-card ov-sk-stack">
            <Skeleton width={120} height={14} />
            <Skeleton width={100} height={44} />
            <Skeleton height={14} />
            <Skeleton height={40} />
          </div>
        ))}
      </div>
      <div className="ov-pair">
        <div className="ov-card ov-timeline ov-sk-stack">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} height={36} />
          ))}
        </div>
        <div className="ov-card ov-activity ov-sk-stack">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} height={28} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── The page ─────────────────────────────────────────────────────────────────

export function OverviewPage() {
  const { theme } = useTheme();
  const {
    orgId,
    campaigns,
    campLoading,
    campError,
    refetchCampaigns,
    prizes,
    prizeLoading,
    prizeError,
    refetchPrizes,
  } = useDashboard();

  // The first load only: a refresh in the background keeps the page on screen.
  const loading =
    (campLoading && campaigns.length === 0) ||
    (prizeLoading && prizes.length === 0);
  const failed = Boolean(campError || prizeError);

  const now = Date.now();
  const summary = campaignSummary(campaigns, now);
  const hasCampaigns = campaigns.length > 0;
  const hasRewards = prizes.length > 0;
  const hasLaunched = campaigns.some((campaign) => campaign.status !== "draft");

  const { setupActive, sandboxTested, finishSetup } = useOnboarding();
  // Read only while it matters: the Overview of an established account does not need it.
  const designs = useExperienceSummaries(setupActive ? orgId : null);
  const setupSteps = deriveSetupSteps({
    hasReward: hasRewards,
    hasCampaign: hasCampaigns,
    hasDesign: designs.savedAt.size > 0,
    sandboxTested,
    hasLaunched,
  });
  const stepsLeft =
    setupActive && setupSteps.some((step) => step.status !== "done");
  // The last step ends setup for good: the section does not come back on a later change.
  const setupDone = setupActive && !stepsLeft;
  useEffect(() => {
    if (setupDone) finishSetup();
  }, [setupDone, finishSetup]);

  return (
    <div
      className="ov-root dz-theme"
      data-theme={theme === "dark" ? "dark" : "light"}
    >
      {loading || designs.loading ? (
        <LoadingState />
      ) : failed ? (
        <ErrorState
          title="Your overview could not be loaded"
          message={campError ?? prizeError ?? undefined}
          onRetry={() => {
            void refetchCampaigns();
            void refetchPrizes();
          }}
        />
      ) : (
        <>
          <PageHeader />
          {stepsLeft && <SetupSection steps={setupSteps} />}
          {(hasLaunched || !stepsLeft) && (
            <>
              <div className="ov-summary">
                {summary.live.length > 0 ? (
                  <ActiveCard
                    live={summary.live.length}
                    endingNext={summary.endingNext}
                    paused={summary.paused}
                    archived={summary.archived}
                    now={now}
                  />
                ) : (
                  <EmptySummaryCard
                    accent="k1"
                    icon={Flag}
                    title="Active now"
                    message="No campaigns live yet"
                    action="Create campaign"
                    to={PATHS.create}
                  />
                )}
                {summary.scheduled.length > 0 ? (
                  <UpNextCard scheduled={summary.scheduled} now={now} />
                ) : (
                  <EmptySummaryCard
                    accent="k4"
                    icon={Calendar}
                    title="Up next"
                    message="Nothing scheduled"
                    action="Schedule a campaign"
                    to={PATHS.create}
                  />
                )}
                {hasRewards ? (
                  <VouchersCard prizes={prizes} />
                ) : (
                  <EmptySummaryCard
                    accent="k3"
                    icon={Ticket}
                    title="Vouchers"
                    message="No rewards in stock"
                    action="Add your first voucher"
                    to={PATHS.prizesLocal}
                    state={{ createReward: true }}
                  />
                )}
              </div>
              <PerformanceSnapshot orgId={orgId} />
              {hasCampaigns && (
                <div className="ov-pair">
                  <CampaignTimeline campaigns={campaigns} prizes={prizes} />
                  <TeamActivity orgId={orgId} />
                </div>
              )}
            </>
          )}
          <OverviewHelp mode={hasCampaigns ? "full" : "empty"} />
        </>
      )}
    </div>
  );
}
