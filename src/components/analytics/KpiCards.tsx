import React from "react";
import type { LucideIcon } from "lucide-react";
import "./kpiCards.css";

/** Blue: volume, inventory, plan. Amber: rewards, capacity. Teal: audience, usage. Violet: retention, alerts, forecast. */
export type KpiTone = "blue" | "amber" | "teal" | "vio";

export type KpiMeter =
  | { type: "seg"; pct: number; left: string; right: string }
  | { type: "blocks"; on: number; total: number; left: string; right: string };

interface KpiCardProps {
  label: string;
  kind: string;
  tone: KpiTone;
  icon: LucideIcon;
  value: string;
  suffix?: string;
  description: string;
  meter?: KpiMeter | null;
}

const clampPercent = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  kind,
  tone,
  icon: Icon,
  value,
  suffix,
  description,
  meter,
}) => (
  <article className={`kx kx-card kx-kpi kx-tone-${tone}`}>
    <div className="kx-head">
      <span className="kx-chip">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="kx-label">{label}</h3>
      <span className="kx-kind">{kind}</span>
    </div>
    <div className="kx-dots" />
    <div className="kx-body">
      <div className="kx-val">
        {value}
        {suffix && <span className="kx-suf">{suffix}</span>}
      </div>
      <p className="kx-desc" title={description}>
        {description}
      </p>
      {meter && (
        <div className="kx-meter">
          <div className="kx-mcap">
            <span title={meter.left}>{meter.left}</span>
            <b>{meter.right}</b>
          </div>
          {meter.type === "seg" ? (
            <div
              className="kx-seg"
              role="meter"
              aria-label={meter.left}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={clampPercent(meter.pct)}
            >
              <i style={{ width: `${clampPercent(meter.pct)}%` }} />
            </div>
          ) : (
            <div
              className="kx-blocks"
              role="meter"
              aria-label={meter.left}
              aria-valuemin={0}
              aria-valuemax={meter.total}
              aria-valuenow={Math.min(meter.on, meter.total)}
            >
              {Array.from({ length: meter.total }, (_, index) => (
                <b key={index} className={index < meter.on ? "on" : ""} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  </article>
);

/** Four cards per row from 1024px, two below. */
export const KpiGrid: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="kx-grid">{children}</div>;

interface DayRulerProps {
  today: number;
  daysInMonth: number;
  startLabel: string;
  todayLabel: string;
  endLabel: string;
}

/** One block per day of the month: past days filled, today raised. */
export const DayRuler: React.FC<DayRulerProps> = ({
  today,
  daysInMonth,
  startLabel,
  todayLabel,
  endLabel,
}) => (
  <article className="kx kx-card">
    <div className="kx-ruler-body">
      <div
        className="kx-ruler"
        role="img"
        aria-label={`Day ${today} of ${daysInMonth}`}
      >
        {Array.from({ length: daysInMonth }, (_, index) => (
          <b
            key={index}
            className={
              index + 1 < today ? "done" : index + 1 === today ? "now" : ""
            }
          />
        ))}
      </div>
      <div className="kx-ruler-labels">
        <span>{startLabel}</span>
        <span>{todayLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  </article>
);

/** Share of `part` in `total`, as a 0–100 number (0 when there is no total). */
export const percentOf = (part: number, total: number) =>
  total > 0 ? (part / total) * 100 : 0;

/** Rounded share for meter captions: "71%", or "—" without a total. */
export const roundedShare = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)}%` : "—";
