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
  /** ISO instant, or empty when the code never expires. */
  value: string | null | undefined;
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
  hasCode,
  locked,
  onChange,
}) => {
  const [saving, setSaving] = useState(false);

  if (!hasCode) {
    return <span className="text-brand-textMuted">—</span>;
  }

  const expired = isCodeExpired(value);

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
          expiryWarning(value ?? null) ?? "Valid until the end of this day"
        }
        value={isoToAlgiersDay(value)}
        disabled={locked || saving}
        onChange={(event) => void handleChange(event.target.value)}
        className="rounded-lg border border-card-border bg-card-bg px-2 py-1 text-xs text-brand-text focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      {expired && (
        <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-amber-500">
          Expired
        </span>
      )}
    </div>
  );
};
