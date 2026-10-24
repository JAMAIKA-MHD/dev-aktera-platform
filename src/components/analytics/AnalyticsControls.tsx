import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Filter } from "lucide-react";
import {
  PROGRAM_PERIODS,
  type ProgramPeriodKey,
} from "../../lib/programAnalyticsTransforms";

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h2 className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
    {children}
  </h2>
);

interface SegmentedToggleProps<K extends string> {
  label: string;
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}

/** A row of mutually exclusive choices; `label` names the group for screen readers. */
export function SegmentedToggle<K extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedToggleProps<K>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center glass-panel p-0.5 rounded-xl text-[11px]"
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={`px-2.5 py-0.5 font-semibold rounded-full cursor-pointer transition-colors ${
            value === option.key
              ? "bg-brand-accent/20 text-brand-accent shadow-sm"
              : "text-brand-text-muted hover:text-brand-text"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export const PeriodToggle: React.FC<{
  value: ProgramPeriodKey;
  onChange: (key: ProgramPeriodKey) => void;
}> = ({ value, onChange }) => (
  <SegmentedToggle
    label="Period"
    options={PROGRAM_PERIODS}
    value={value}
    onChange={onChange}
  />
);

/**
 * The period as a toolbar button: shows the period applied and opens the list of periods.
 * Styled like the toolbar's other buttons (Export Data).
 */
export const PeriodFilterButton: React.FC<{
  value: ProgramPeriodKey;
  onChange: (key: ProgramPeriodKey) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current =
    PROGRAM_PERIODS.find((period) => period.key === value) ??
    PROGRAM_PERIODS[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        title="Filter the analytics by period"
        className="glass-panel px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-brand-text hover:bg-card-bg-subtle cursor-pointer transition-colors"
      >
        <Filter className="h-3.5 w-3.5 text-brand-textMuted" aria-hidden />
        {current.label}
        <ChevronDown
          className={`h-3.5 w-3.5 text-brand-textMuted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Period"
          className="absolute right-0 z-50 mt-1.5 w-40 rounded-xl border border-card-border bg-card-bg py-1 shadow-lg"
        >
          {PROGRAM_PERIODS.map((period) => {
            const selected = period.key === value;
            return (
              <button
                key={period.key}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(period.key);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs cursor-pointer transition-colors hover:bg-card-bg-subtle ${
                  selected
                    ? "font-semibold text-brand-accent"
                    : "text-brand-text"
                }`}
              >
                {period.label}
                {selected && <Check className="h-3.5 w-3.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AnalyticsLoading: React.FC = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
  </div>
);

export const AnalyticsError: React.FC<{ message: string }> = ({ message }) => (
  <div className="glass-panel rounded-2xl p-4 text-red-400 font-medium">
    {message}
  </div>
);
