import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
} from "lucide-react";

import { PATHS, STANDALONE_STUDIO } from "../../dashboard/paths";
import { useTheme } from "../../contexts/ThemeContext";
import { CampaignTimeline } from "./CampaignTimeline";
import { OverviewHelp } from "./OverviewHelp";
import {
  ACTIVITY,
  ACTIVITY_FILTERS,
  ACTIVITY_LIMIT,
  GAME_LIST,
  LOW_VOUCHERS,
  PERFORMANCE,
  sparkValues,
  type ActivityFilter,
  type RangeKey,
} from "./overviewData";
import {
  Delta,
  FilterChips,
  ICON,
  SMALL_ICON,
  Segmented,
  Sparkline,
  TextLink,
} from "./overviewParts";
import "./overview.css";

// The Overview page of the console. It shows mock data only (overviewData.ts): `mode` picks the
// full page, the first-run page of a new account, or the loading skeleton.

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
    <div ref={rootRef} className="ov-split-btn">
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
              const GameIcon = game.icon;
              return (
                <Link
                  key={game.label}
                  to={PATHS.create}
                  role="menuitem"
                  className={`ov-menu-item ${game.accent}`}
                >
                  <span aria-hidden className="ov-tile ov-tile-36">
                    <GameIcon {...ICON} />
                  </span>
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

function PageHeader() {
  return (
    <header className="ov-page-head">
      <div>
        <h1>Overview Page</h1>
        <p className="ov-sub">Thursday 29 October</p>
      </div>
      <NewCampaignButton />
    </header>
  );
}

// ── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards() {
  return (
    <div className="ov-summary">
      <section className="ov-card ov-sum k1" aria-labelledby="ov-sum-active">
        <Link
          to={PATHS.campaigns}
          className="ov-card-link"
          aria-label="Active now: 7 campaigns live. Open campaigns list"
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
          <strong>7</strong>
          <span>campaigns live</span>
        </p>
        <p className="ov-sum-context ov-text-bad ov-semibold">
          <Clock {...SMALL_ICON} />1 ends in 28 h
        </p>
        <div className="ov-sum-visual">
          <div className="ov-stack" aria-hidden>
            <span style={{ flex: 7 }} />
            <span style={{ flex: 3 }} />
            <span style={{ flex: 12 }} />
          </div>
          <div className="ov-legend">
            <span>
              <span aria-hidden className="ov-dot ov-dot-1" />7 active
            </span>
            <span>
              <span aria-hidden className="ov-dot ov-dot-2" />3 paused
            </span>
            <span>
              <span aria-hidden className="ov-dot ov-dot-3" />
              12 archived
            </span>
          </div>
        </div>
        <div className="ov-footer">
          <TextLink to={PATHS.campaigns} label="View all campaigns" />
        </div>
      </section>

      <section className="ov-card ov-sum k4" aria-labelledby="ov-sum-next">
        <Link
          to={PATHS.campaigns}
          className="ov-card-link"
          aria-label="Up next: Winter Gift Wheel starts in 2 days 13 hours. Open the schedule"
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
          <strong className="ov-text-accent">2d 13h</strong>
          <span>until launch</span>
        </p>
        <p className="ov-sum-context ov-text-muted">
          <strong className="ov-strong">Winter Gift Wheel</strong>· Sun 1 Nov,
          09:00
        </p>
        <div className="ov-sum-visual">
          <div className="ov-sum-chips">
            <span className="ov-chip">Lucky Spin</span>
            <span className="ov-badge ov-badge-sm ov-ok">
              <CircleCheck {...SMALL_ICON} />
              Prize set
            </span>
          </div>
          <p className="ov-caption">
            1 more scheduled: Black Friday Quiz · 25 Nov
          </p>
        </div>
        <div className="ov-footer">
          <TextLink to={PATHS.campaigns} label="Open schedule" />
          <Link to={PATHS.campaigns} className="ov-btn ov-btn-sm">
            Edit
          </Link>
        </div>
      </section>

      <section
        className="ov-card ov-sum t-danger"
        aria-labelledby="ov-sum-vouchers"
      >
        <Link
          to={PATHS.prizes}
          className="ov-card-link"
          aria-label="Vouchers: 3 running low. Open vouchers filtered to critical"
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
          <strong className="ov-text-bad">3</strong>
          <span>running low</span>
        </p>
        <p className="ov-sum-context ov-text-muted">
          Critical: under 10 units or under 15% of stock
        </p>
        <div className="ov-sum-visual ov-vouchers">
          {LOW_VOUCHERS.map((voucher) => (
            <div key={voucher.name}>
              <p>
                <span>{voucher.name}</span>
                <strong className="dz-num" data-tone={voucher.variant}>
                  {voucher.left} left
                </strong>
              </p>
              <progress
                className={`ov-progress ov-progress-${voucher.variant}`}
                value={voucher.value}
                max={100}
                aria-label={`${voucher.name}: ${voucher.left} left of ${voucher.total}`}
              />
            </div>
          ))}
        </div>
        <div className="ov-footer">
          <TextLink to={PATHS.prizes} label="View full inventory" />
          <Link to={PATHS.prizes} className="ov-btn ov-btn-sm">
            Restock low items
          </Link>
        </div>
      </section>
    </div>
  );
}

// ── Performance snapshot ─────────────────────────────────────────────────────

function PerformanceSnapshot() {
  const [perfRange, setPerfRange] = useState<RangeKey>("7d");
  const data = PERFORMANCE[perfRange];
  const versus = `vs previous ${data.days} days`;

  return (
    <section className="ov-card ov-perf" aria-labelledby="ov-performance-title">
      <div className="ov-perf-head">
        <div>
          <h2 id="ov-performance-title" className="ov-title">
            Performance snapshot
          </h2>
          <p className="ov-sub">
            Last {data.days} days, compared with the previous {data.days} days
          </p>
        </div>
        <div className="ov-perf-actions">
          <Segmented
            label="Performance period"
            value={perfRange}
            options={(["7d", "30d"] as const).map((key) => ({
              key,
              label: PERFORMANCE[key].tab,
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
            <p className="ov-stat-value">{data.participants}</p>
            <p className="ov-stat-delta">
              <Delta value={data.participantsDelta} />
              <span className="ov-caption">{versus}</span>
            </p>
          </div>
          <Sparkline
            values={sparkValues(data.days)}
            label={`Participation trend over the last ${data.days} days`}
          />
        </div>
        <div className="ov-stat k3">
          <div className="ov-stat-main">
            <p className="ov-stat-label">Rewards claimed</p>
            <p className="ov-stat-value">
              {data.claimed}
              <span> of {data.available} available</span>
            </p>
            <progress
              className="ov-progress ov-progress-warning"
              value={data.claimedShare}
              max={100}
              aria-label={`Rewards claimed: ${data.claimedShare}%`}
            />
            <p className="ov-caption dz-num">{data.claimedShare}% claimed</p>
          </div>
        </div>
        <div className="ov-stat k2">
          <div className="ov-stat-main">
            <p className="ov-stat-label">Redemption rate</p>
            <p className="ov-stat-value">{data.redemption}</p>
            <p className="ov-stat-delta">
              <Delta value={data.redemptionDelta} />
              <span className="ov-caption">{versus}</span>
            </p>
            <p className="ov-caption">of handed-out rewards were redeemed</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Team activity ────────────────────────────────────────────────────────────

const ACTIVITY_ROUTES = {
  campaign: PATHS.campaigns,
  reward: PATHS.prizes,
  team: PATHS.account,
} as const;

function TeamActivity() {
  const [actFilter, setActFilter] = useState<ActivityFilter>("all");
  const rows = ACTIVITY.filter(
    (row) => actFilter === "all" || row.category === actFilter,
  ).slice(0, ACTIVITY_LIMIT);

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
      <ul className="ov-activity-list">
        {rows.map((row) => (
          <li key={row.absolute} className={row.accent}>
            <span aria-hidden className="ov-avatar">
              {row.initials}
            </span>
            <div>
              <p className="ov-sub">
                <strong>{row.who}</strong> {row.verb}{" "}
                <Link to={ACTIVITY_ROUTES[row.category]}>{row.object}</Link>
                {row.suffix && ` ${row.suffix}`}
              </p>
              {row.detail && (
                <p className="ov-activity-detail">
                  <ArrowRight {...SMALL_ICON} />
                  {row.detail}
                </p>
              )}
              <p className="ov-caption dz-num">
                {row.relative} ·{" "}
                <span title={row.absolute}>{row.absolute}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="ov-activity-foot">
        <TextLink to={PATHS.account} label="View all activity" />
      </div>
    </section>
  );
}

// ── States ───────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <section className="ov-card ov-empty" aria-labelledby="ov-empty-title">
      <span aria-hidden className="ov-tile ov-tile-56 k1">
        <Flag {...ICON} size={24} />
      </span>
      <div>
        <h2 id="ov-empty-title">Create your first campaign</h2>
        <p className="ov-sub">
          Pick a game type to get started. You can change the design, prizes and
          schedule at any time before you launch.
        </p>
      </div>
      <div className="ov-empty-games">
        {GAME_LIST.map((game) => {
          const GameIcon = game.icon;
          return (
            <Link
              key={game.label}
              to={PATHS.create}
              className={`ov-card ${game.accent}`}
            >
              <span aria-hidden className="ov-tile ov-tile-40">
                <GameIcon {...ICON} />
              </span>
              <strong>{game.label}</strong>
              <span className="ov-caption">{game.caption}</span>
            </Link>
          );
        })}
      </div>
      <TextLink
        to={PATHS.studioFor(STANDALONE_STUDIO)}
        label="Preview a sample campaign in the player sandbox"
      />
    </section>
  );
}

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

export interface OverviewPageProps {
  mode?: "full" | "empty" | "loading";
  /** Shows the performance snapshot. */
  performance?: boolean;
}

export function OverviewPage({
  mode = "full",
  performance = true,
}: OverviewPageProps) {
  const { theme } = useTheme();

  return (
    <div
      className="ov-root dz-theme"
      data-theme={theme === "dark" ? "dark" : "light"}
    >
      {mode === "loading" && <LoadingState />}
      {mode === "empty" && (
        <>
          <PageHeader />
          <EmptyState />
        </>
      )}
      {mode === "full" && (
        <>
          <PageHeader />
          <SummaryCards />
          {performance && <PerformanceSnapshot />}
          <div className="ov-pair">
            <CampaignTimeline />
            <TeamActivity />
          </div>
        </>
      )}
      {mode !== "loading" && <OverviewHelp mode={mode} />}
    </div>
  );
}
