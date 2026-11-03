import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Maximize2,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";

import { PATHS } from "../../dashboard/paths";
import type { Campaign, PrizeTemplate } from "../../types";
import {
  CAMPAIGN_STATUSES,
  DAY,
  GAME_TYPES,
  TIMELINE_FILTERS,
  addDays,
  extendedTimelineScale,
  isoDate,
  longDate,
  shortDate,
  startOfDay,
  timelineScales,
  type Scale,
  type TimelineCampaign,
  type TimelineFilter,
} from "./overviewData";
import { GameEmblem } from "../campaigns/GameEmblem";
import { timelineCampaigns } from "./overviewMetrics";
import { FilterChips, SMALL_ICON, Segmented, TextLink } from "./overviewParts";

const MIN_BAR_WIDTH = 1.2;
// The card shows the first campaigns only; the full timeline opens in its own window.
export const BRIEF_ROWS = 4;
// The full timeline is drawn at a fixed width per day, so a longer range scrolls sideways.
const DAY_WIDTH: Record<Scale, number> = { weeks: 18, months: 6 };
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

function StatusBadge({ campaign }: { campaign: TimelineCampaign }) {
  const status = CAMPAIGN_STATUSES[campaign.status];
  const StatusIcon = status.icon;
  return (
    <span className={`ov-badge ov-badge-sm ov-${status.tone}`}>
      <StatusIcon {...SMALL_ICON} />
      {status.label}
    </span>
  );
}

function CampaignBar({
  campaign,
  percent,
  rangeStart,
  rangeEnd,
  selected,
  onSelect,
}: {
  campaign: TimelineCampaign;
  percent: (time: number) => number;
  rangeStart: number;
  rangeEnd: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const game = GAME_TYPES[campaign.game];
  const status = CAMPAIGN_STATUSES[campaign.status].label;
  const left = percent(campaign.start);
  const width = Math.max(percent(campaign.end) - left, MIN_BAR_WIDTH);
  const prize = campaign.prize ?? "No prize yet";
  return (
    <button
      type="button"
      className={`ov-bar ov-bar-${campaign.status}`}
      data-clip-start={campaign.start < rangeStart || undefined}
      data-clip-end={campaign.end > rangeEnd || undefined}
      // A bar starting late in the range opens its tooltip leftwards, inside the chart.
      data-tip-left={left > 60 || undefined}
      style={{ left: `${left}%`, width: `${width}%` }}
      aria-pressed={selected}
      aria-label={`${campaign.name}: ${status}, ${game.label}, ${campaign.dates}, ${prize}. ${campaign.rightLabel}`}
      onClick={onSelect}
    >
      {campaign.ending && (
        <span aria-hidden className="ov-bar-marker">
          !
        </span>
      )}
      <span aria-hidden className="ov-tip">
        <strong>{campaign.name}</strong>
        <span>
          {game.label} · {campaign.dates}
        </span>
        <span>
          {status} · {prize}
        </span>
      </span>
    </button>
  );
}

function SelectedCampaign({ campaign }: { campaign: TimelineCampaign }) {
  const game = GAME_TYPES[campaign.game];
  return (
    <div className="ov-detail">
      <div className="ov-detail-head">
        <GameEmblem gameType={campaign.game} size={40} />
        <div className="ov-detail-name">
          <p className="ov-strong">{campaign.name}</p>
          <p className="ov-caption dz-num">
            {game.label} · {campaign.dates}
          </p>
        </div>
      </div>
      <div className="ov-detail-line">
        <StatusBadge campaign={campaign} />
        <span className="ov-tone" data-tone={campaign.rightTone}>
          {campaign.rightLabel}
        </span>
      </div>
      <p className="ov-detail-prize">
        {campaign.prize ? (
          <>
            <CircleCheck {...SMALL_ICON} className="dz-icon ov-text-ok" />
            {campaign.prize}
          </>
        ) : (
          <>
            <TriangleAlert {...SMALL_ICON} className="dz-icon ov-text-bad" />
            No prize yet
          </>
        )}
      </p>
      <div className="ov-detail-actions">
        <Link to={PATHS.campaign(campaign.id)} className="ov-btn ov-btn-sm">
          Open campaign
        </Link>
        <Link to={PATHS.edit(campaign.id)} className="ov-btn ov-btn-sm">
          Edit schedule
        </Link>
      </div>
    </div>
  );
}

function SelectedDate({
  date,
  today,
  onChange,
}: {
  date: number | null;
  today: number;
  onChange: (date: number | null) => void;
}) {
  return (
    <div className="ov-detail">
      <p className="ov-caption">Selected date</p>
      {date === null ? (
        <p className="ov-sub">
          Click an empty spot on the timeline to pick a date, then create a
          campaign that starts on it.
        </p>
      ) : (
        <>
          <div className="ov-date-step">
            <button
              type="button"
              className="dz-icon-btn ov-icon-btn-sm"
              aria-label="Previous day"
              title="Previous day"
              onClick={() => onChange(addDays(date, -1))}
            >
              <ChevronLeft {...SMALL_ICON} />
            </button>
            <span className="ov-date-long dz-num">{longDate(date)}</span>
            <button
              type="button"
              className="dz-icon-btn ov-icon-btn-sm"
              aria-label="Next day"
              title="Next day"
              onClick={() => onChange(addDays(date, 1))}
            >
              <ChevronRight {...SMALL_ICON} />
            </button>
            <button
              type="button"
              className="ov-link"
              onClick={() => onChange(null)}
            >
              Clear
            </button>
          </div>
          {date < today ? (
            <p className="ov-caption">
              This day has passed. Pick today or a later date.
            </p>
          ) : (
            <div>
              <Link
                to={PATHS.create}
                state={{ startDate: isoDate(date) }}
                className="ov-btn ov-btn-sm ov-btn-primary"
              >
                <Plus {...SMALL_ICON} />
                Create campaign on this date
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// The chart itself: the names on the left, the bars on the scale. The card and the full
// timeline window draw the same chart; the window shows every campaign and scrolls.
function TimelineChart({
  campaigns,
  scale,
  range,
  percent,
  now,
  selectedId,
  onSelect,
  selDate,
  onPickDate,
  expanded = false,
  width,
  more,
}: {
  campaigns: TimelineCampaign[];
  scale: Scale;
  range: ReturnType<typeof timelineScales>[Scale];
  percent: (time: number) => number;
  now: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  selDate: number | null;
  onPickDate: (event: MouseEvent<HTMLElement>) => void;
  expanded?: boolean;
  /** In pixels: the full timeline is wider than its window and scrolls sideways. */
  width?: number;
  /** Under the last name: the way to the campaigns not shown. */
  more?: ReactNode;
}) {
  const rangeEnd = range.start + range.days * DAY;
  const dateVisible =
    selDate !== null && selDate >= range.start && selDate < rangeEnd;
  // The middle of the day, so the line sits inside the day it names.
  const datePosition = dateVisible ? percent(selDate + DAY / 2) : 0;

  return (
    <div className="ov-tl" data-expanded={expanded || undefined}>
      <div className="ov-tl-labels">
        <div aria-hidden className="ov-tl-labels-head" />
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="ov-tl-name">
            <GameEmblem gameType={campaign.game} size={24} />
            <span title={campaign.name}>{campaign.name}</span>
          </div>
        ))}
        {more}
      </div>

      <div
        className="ov-tl-chart"
        style={width ? { minWidth: `${width}px` } : undefined}
      >
        <div className="ov-tl-axis" data-scale={scale} aria-hidden>
          {range.ticks.map((tick) => (
            <span
              key={tick.label}
              className="dz-num"
              style={{ left: `${percent(tick.time)}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>
        <div className="ov-tl-plot">
          <button
            type="button"
            className="ov-tl-pick"
            aria-label="Pick a date on the timeline"
            onClick={onPickDate}
          />
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="ov-tl-row"
              onClick={(event) => {
                if (event.target === event.currentTarget) onPickDate(event);
              }}
            >
              <CampaignBar
                campaign={campaign}
                percent={percent}
                rangeStart={range.start}
                rangeEnd={rangeEnd}
                selected={campaign.id === selectedId}
                onSelect={() => onSelect(campaign.id)}
              />
            </div>
          ))}
          {range.ticks.map((tick) => (
            <span
              key={tick.label}
              aria-hidden
              className="ov-tl-grid"
              style={{ left: `${percent(tick.time)}%` }}
            />
          ))}
          <span
            aria-hidden
            className="ov-tl-today"
            style={{ left: `${percent(now)}%` }}
          >
            <span>Today</span>
          </span>
          {dateVisible && (
            <span
              aria-hidden
              className="ov-tl-date"
              style={{ left: `${datePosition}%` }}
            >
              <span className="dz-num">{shortDate(selDate)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="ov-legend">
      <span>
        <span aria-hidden className="ov-swatch ov-bar-active" />
        Active
      </span>
      <span>
        <span aria-hidden className="ov-swatch ov-bar-scheduled" />
        Scheduled
      </span>
      <span>
        <span aria-hidden className="ov-swatch ov-bar-paused" />
        Paused
      </span>
      <span>
        <span aria-hidden className="ov-swatch-dot" />
        Ends within 3 days
      </span>
    </div>
  );
}

// The full timeline: a window over the page with every campaign, scrolling up and down.
// It sits in the page's theme (the Overview's tokens live on its .dz-theme root).
function TimelineWindow({
  theme,
  header,
  tools,
  onClose,
  children,
}: {
  theme: string | null;
  header: ReactNode;
  tools: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="dz-theme ov-tl-overlay"
      data-theme={theme ?? undefined}
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ov-tl-window-title"
        className="ov-card ov-col ov-tl-window"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ov-head">
          {header}
          <div className="ov-tl-window-tools">
            {tools}
            <button
              ref={closeRef}
              type="button"
              className="dz-icon-btn"
              aria-label="Close the full timeline"
              title="Close"
              onClick={onClose}
            >
              <X {...SMALL_ICON} />
            </button>
          </div>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}

export function CampaignTimeline({
  campaigns: allCampaigns,
  prizes,
}: {
  campaigns: Campaign[];
  prizes: PrizeTemplate[];
}) {
  const [scale, setScale] = useState<Scale>("weeks");
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [selDate, setSelDate] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const now = Date.now();
  const scales = timelineScales(now);
  const rows = timelineCampaigns(allCampaigns, prizes, now);

  const range = scales[scale];
  const span = range.days * DAY;
  const percent = (time: number) =>
    clampPercent(((time - range.start) / span) * 100);

  const matches = TIMELINE_FILTERS.find((f) => f.key === filter)!.matches;
  const campaigns = rows.filter(matches);

  // The full timeline reaches back to the earliest start and past the latest end.
  const fullRange = extendedTimelineScale(scale, range, campaigns);
  const fullSpan = fullRange.days * DAY;
  const fullPercent = (time: number) =>
    clampPercent(((time - fullRange.start) / fullSpan) * 100);
  const fullWidth = fullRange.days * DAY_WIDTH[scale];

  // The full timeline opens on today, and comes back to it when its scale or filter changes.
  const scrollToToday = () => {
    const box = scrollRef.current;
    const today = box?.querySelector<HTMLElement>(".ov-tl-today");
    const labels = box?.querySelector<HTMLElement>(".ov-tl-labels");
    if (!box || !today) return;
    const offset =
      today.getBoundingClientRect().left - box.getBoundingClientRect().left;
    box.scrollLeft += offset - (labels?.offsetWidth ?? 0) - 48;
  };
  useEffect(() => {
    if (expanded) scrollToToday();
    // scrollToToday only reads the page: it needs no dependency of its own.
  }, [expanded, scale, filter]);
  const briefCampaigns = campaigns.slice(0, BRIEF_ROWS);
  const hiddenCount = campaigns.length - briefCampaigns.length;
  const selected =
    campaigns.find((c) => c.id === selId) ?? campaigns[0] ?? null;
  const filterOptions = TIMELINE_FILTERS.map(({ key, label, matches }) => ({
    key,
    label,
    count: rows.filter(matches).length,
  }));

  const pickDateIn =
    (start: number, length: number) => (event: MouseEvent<HTMLElement>) => {
      // A keyboard press has no position: it picks today.
      if (event.detail === 0) {
        setSelDate(startOfDay(now));
        return;
      }
      const plot = event.currentTarget.closest(".ov-tl-plot");
      if (!plot) return;
      const { left, width } = plot.getBoundingClientRect();
      const share = Math.min(1, Math.max(0, (event.clientX - left) / width));
      setSelDate(startOfDay(start + share * length));
    };

  const scaleSwitch = (
    <Segmented
      label="Timeline scale"
      value={scale}
      options={(["weeks", "months"] as const).map((key) => ({
        key,
        label: scales[key].tab,
      }))}
      onChange={setScale}
    />
  );
  const filterChips = (
    <FilterChips
      label="Filter campaigns"
      value={filter}
      options={filterOptions}
      onChange={setFilter}
    />
  );
  const chart = (isExpanded: boolean) =>
    campaigns.length === 0 ? (
      <p className="ov-tl-none">
        {rows.length === 0
          ? "Nothing live, scheduled or paused right now."
          : "No campaigns match this filter."}
      </p>
    ) : (
      <TimelineChart
        campaigns={isExpanded ? campaigns : briefCampaigns}
        scale={scale}
        range={isExpanded ? fullRange : range}
        percent={isExpanded ? fullPercent : percent}
        now={now}
        selectedId={selected?.id ?? null}
        onSelect={setSelId}
        selDate={selDate}
        onPickDate={
          isExpanded
            ? pickDateIn(fullRange.start, fullSpan)
            : pickDateIn(range.start, span)
        }
        expanded={isExpanded}
        width={isExpanded ? fullWidth : undefined}
        more={
          !isExpanded && hiddenCount > 0 ? (
            <button
              type="button"
              className="ov-link ov-tl-more"
              title={`Show all ${campaigns.length} campaigns`}
              onClick={() => setExpanded(true)}
            >
              See more
              <span className="dz-num">+{hiddenCount}</span>
            </button>
          ) : undefined
        }
      />
    );
  const details = (
    <div className="ov-details" aria-live="polite">
      {selected && <SelectedCampaign campaign={selected} />}
      <SelectedDate
        date={selDate}
        today={startOfDay(now)}
        onChange={setSelDate}
      />
    </div>
  );

  return (
    <section
      ref={cardRef}
      className="ov-card ov-timeline ov-col"
      aria-labelledby="ov-timeline-title"
    >
      <div className="ov-head">
        <div className="ov-tl-heading">
          <button
            type="button"
            className="dz-icon-btn ov-icon-btn-sm"
            aria-label="Open the full timeline"
            title="Open the full timeline"
            aria-haspopup="dialog"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 {...SMALL_ICON} />
          </button>
          <div>
            <h2 id="ov-timeline-title" className="ov-title">
              Campaign timeline
            </h2>
            <p className="ov-sub">{range.subtitle}</p>
          </div>
        </div>
        {scaleSwitch}
      </div>

      {filterChips}
      {chart(false)}

      {details}

      <div className="ov-footer">
        <Legend />
        <TextLink to={PATHS.campaigns} label="View all campaigns" />
      </div>

      {expanded && (
        <TimelineWindow
          theme={
            cardRef.current?.closest(".dz-theme")?.getAttribute("data-theme") ??
            null
          }
          onClose={() => setExpanded(false)}
          tools={
            <>
              <button
                type="button"
                className="ov-btn ov-btn-sm"
                onClick={scrollToToday}
              >
                Today
              </button>
              {scaleSwitch}
            </>
          }
          header={
            <div>
              <h2 id="ov-tl-window-title" className="ov-title">
                Full campaign timeline
              </h2>
              <p className="ov-sub dz-num">
                {fullRange.subtitle} · {campaigns.length}{" "}
                {campaigns.length === 1 ? "campaign" : "campaigns"} · scroll
                sideways to see their ends, or pick a free day to schedule one
              </p>
            </div>
          }
        >
          {filterChips}
          <div ref={scrollRef} className="ov-tl-scroll">
            {chart(true)}
          </div>
          {details}
          <div className="ov-footer">
            <Legend />
          </div>
        </TimelineWindow>
      )}
    </section>
  );
}
