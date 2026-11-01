import { useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Plus,
  TriangleAlert,
} from "lucide-react";

import { PATHS } from "../../dashboard/paths";
import type { Campaign, PrizeTemplate } from "../../types";
import {
  CAMPAIGN_STATUSES,
  DAY,
  GAME_TYPES,
  TIMELINE_FILTERS,
  addDays,
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
// A bar ending past this share of a narrow chart has no room for its label after it.
const LATE_BAR_END = 55;
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
  const barEnd = left + width;
  const prize = campaign.prize ?? "No prize yet";
  return (
    <>
      <button
        type="button"
        className={`ov-bar ov-bar-${campaign.status}`}
        data-clip-start={campaign.start < rangeStart || undefined}
        data-clip-end={campaign.end > rangeEnd || undefined}
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
      <span
        className="ov-bar-label"
        data-tone={campaign.rightTone}
        data-late={barEnd > LATE_BAR_END || undefined}
        style={{ "--bar-end": `${barEnd}%` } as CSSProperties}
      >
        {campaign.rightLabel}
      </span>
    </>
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
  const plotRef = useRef<HTMLDivElement>(null);

  const now = Date.now();
  const scales = timelineScales(now);
  const rows = timelineCampaigns(allCampaigns, prizes, now);

  const range = scales[scale];
  const span = range.days * DAY;
  const rangeEnd = range.start + span;
  const percent = (time: number) =>
    clampPercent(((time - range.start) / span) * 100);

  const matches = TIMELINE_FILTERS.find((f) => f.key === filter)!.matches;
  const campaigns = rows.filter(matches);
  const selected =
    campaigns.find((c) => c.id === selId) ?? campaigns[0] ?? null;
  const filterOptions = TIMELINE_FILTERS.map(({ key, label, matches }) => ({
    key,
    label,
    count: rows.filter(matches).length,
  }));

  const dateVisible =
    selDate !== null && selDate >= range.start && selDate < rangeEnd;
  // The middle of the day, so the line sits inside the day it names.
  const datePosition = dateVisible ? percent(selDate + DAY / 2) : 0;

  const pickDate = (event: MouseEvent) => {
    const plot = plotRef.current;
    if (!plot) return;
    // A keyboard press has no position: it picks today.
    if (event.detail === 0) {
      setSelDate(startOfDay(now));
      return;
    }
    const { left, width } = plot.getBoundingClientRect();
    const share = Math.min(1, Math.max(0, (event.clientX - left) / width));
    setSelDate(startOfDay(range.start + share * span));
  };

  return (
    <section
      className="ov-card ov-timeline ov-col"
      aria-labelledby="ov-timeline-title"
    >
      <div className="ov-head">
        <div>
          <h2 id="ov-timeline-title" className="ov-title">
            Campaign timeline
          </h2>
          <p className="ov-sub">{range.subtitle}</p>
        </div>
        <Segmented
          label="Timeline scale"
          value={scale}
          options={(["weeks", "months"] as const).map((key) => ({
            key,
            label: scales[key].tab,
          }))}
          onChange={setScale}
        />
      </div>

      <FilterChips
        label="Filter campaigns"
        value={filter}
        options={filterOptions}
        onChange={setFilter}
      />

      {campaigns.length === 0 ? (
        <p className="ov-tl-none">
          {rows.length === 0
            ? "Nothing live, scheduled or paused right now."
            : "No campaigns match this filter."}
        </p>
      ) : (
        <div className="ov-tl">
          <div className="ov-tl-labels">
            {campaigns.map((campaign) => {
              return (
                <div key={campaign.id} className="ov-tl-name">
                  <GameEmblem gameType={campaign.game} size={24} />
                  <span title={campaign.name}>{campaign.name}</span>
                </div>
              );
            })}
          </div>

          <div className="ov-tl-chart">
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
            <div ref={plotRef} className="ov-tl-plot">
              <button
                type="button"
                className="ov-tl-pick"
                aria-label="Pick a date on the timeline"
                onClick={pickDate}
              />
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="ov-tl-row"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) pickDate(event);
                  }}
                >
                  <CampaignBar
                    campaign={campaign}
                    percent={percent}
                    rangeStart={range.start}
                    rangeEnd={rangeEnd}
                    selected={campaign.id === selected?.id}
                    onSelect={() => setSelId(campaign.id)}
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
      )}

      <div className="ov-details" aria-live="polite">
        {selected && <SelectedCampaign campaign={selected} />}
        <SelectedDate
          date={selDate}
          today={startOfDay(now)}
          onChange={setSelDate}
        />
      </div>

      <div className="ov-footer">
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
        <TextLink to={PATHS.campaigns} label="View all campaigns" />
      </div>
    </section>
  );
}
