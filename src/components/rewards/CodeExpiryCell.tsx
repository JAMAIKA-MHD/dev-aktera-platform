import React, { useState } from "react";
import {
  algiersEndOfDayToIso,
  expiryWarning,
  isCodeExpired,
  isoToAlgiersDay,
} from "../../lib/codeExpiry";

interface CodeExpiryCellProps {
  /** Position of the code in its list, for the accessible name. */
  index: number;
  /** The code's own date (ISO instant), or empty. */
  value: string | null | undefined;
  /** The reward's date: it applies while the code has none of its own. */
  inheritedValue?: string | null;
  /** An empty slot has nothing to expire. */
  hasCode: boolean;
  /** A code already given to a winner, or a read-only viewer. */
  locked: boolean;
  onChange: (expiresAt: string | null) => Promise<boolean>;
}

// One code's expiry: a day picked by the brand, valid until the end of that day in Algeria.
// The database decides what is really given to a winner; this only shows what was set.
export const CodeExpiryCell: React.FC<CodeExpiryCellProps> = ({
  index,
  value,
  inheritedValue = null,
  hasCode,
  locked,
  onChange,
}) => {
  const [saving, setSaving] = useState(false);

  if (!hasCode) {
    return <span className="text-brand-textMuted">—</span>;
  }

  const shown = value || inheritedValue;
  const fromReward = !value && Boolean(inheritedValue);
  const expired = isCodeExpired(shown);

  const handleChange = async (day: string) => {
    const iso = day === "" ? null : algiersEndOfDayToIso(day);
    if (day !== "" && iso === null) return;
    setSaving(true);
    await onChange(iso);
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        aria-label={`Expiry date of code ${index}`}
        title={
          expiryWarning(shown ?? null) ??
          (fromReward
            ? "Date of the reward, valid until the end of this day. Pick a date to give this code its own."
            : "Valid until the end of this day")
        }
        value={isoToAlgiersDay(shown)}
        disabled={locked || saving}
        onChange={(event) => void handleChange(event.target.value)}
        className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-xs text-brand-text focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      {fromReward && !expired && (
        <span className="text-[10px] text-brand-textMuted">from reward</span>
      )}
      {expired && (
        <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-amber-500">
          Expired
        </span>
      )}
    </div>
  );
};
