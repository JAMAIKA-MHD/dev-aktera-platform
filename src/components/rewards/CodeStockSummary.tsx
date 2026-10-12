import React, { useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  algiersEndOfDayToIso,
  expiryWarning,
  type CodeCounts,
} from "../../lib/codeExpiry";

interface CodeStockSummaryProps {
  counts: CodeCounts;
  /** Wins the campaigns still expect from this reward (allocated minus already won). */
  remainingToWin: number;
  /** False for a read-only viewer. */
  canEdit: boolean;
  busy?: boolean;
  /** Returns how many codes were updated, or null when it failed. */
  onApplyExpiry: (
    expiresAt: string | null,
    onlyWithoutDate: boolean,
  ) => Promise<number | null>;
}

// What is left to give for a digital reward, a warning before the codes run out, and one date
// for all the codes at once. The database remains the only judge of what a winner receives.
export const CodeStockSummary: React.FC<CodeStockSummaryProps> = ({
  counts,
  remainingToWin,
  canEdit,
  busy = false,
  onApplyExpiry,
}) => {
  const inputId = useId();
  const [day, setDay] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const total = counts.available + counts.used + counts.expired;
  const iso = day ? algiersEndOfDayToIso(day) : null;
  const warning = expiryWarning(iso);

  const exhausted = total > 0 && counts.available === 0;
  const runningShort =
    !exhausted && total > 0 && remainingToWin > counts.available;

  const apply = async () => {
    if (!iso) return;
    setMessage(null);
    const updated = await onApplyExpiry(iso, !replaceExisting);
    setMessage(
      updated === null
        ? "The expiry could not be set. Please try again."
        : `Expiry set on ${updated} code${updated === 1 ? "" : "s"}.`,
    );
  };

  return (
    <section
      aria-label="Code availability"
      className="mx-6 mt-4 space-y-3 rounded-2xl border border-card-border bg-card-bg-subtle p-4"
    >
      <p className="text-xs text-brand-text">
        <strong className="text-emerald-500">{counts.available}</strong>{" "}
        available · <strong>{counts.used}</strong> used ·{" "}
        <strong className={counts.expired > 0 ? "text-amber-500" : ""}>
          {counts.expired}
        </strong>{" "}
        expired
      </p>

      {(exhausted || runningShort || counts.expired > 0) && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 p-3 text-xs text-amber-500"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            {exhausted
              ? "No code left to give: this reward stops being drawn until you add more codes."
              : runningShort
                ? `Campaigns still expect ${remainingToWin} winner${remainingToWin === 1 ? "" : "s"} but only ${counts.available} code${counts.available === 1 ? " is" : "s are"} available: this reward stops being drawn when its codes run out.`
                : `${counts.expired} expired code${counts.expired === 1 ? " is" : "s are"} never given to a winner.`}
          </span>
        </div>
      )}

      {canEdit && total > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor={inputId}
              className="mb-1 block text-[10px] font-black uppercase tracking-wider text-brand-textMuted"
            >
              Expiry for all codes
            </label>
            <input
              id={inputId}
              type="date"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className="rounded-lg border border-card-border bg-card-bg px-2 py-1.5 text-xs text-brand-text focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-xs text-brand-textMuted">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(event) => setReplaceExisting(event.target.checked)}
            />
            Replace dates already set
          </label>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={!iso || busy}
            className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply to all codes
          </button>
          {warning && (
            <span className="pb-1.5 text-[11px] text-amber-500">{warning}</span>
          )}
          {message && (
            <span
              role="status"
              className="pb-1.5 text-[11px] text-brand-textMuted"
            >
              {message}
            </span>
          )}
        </div>
      )}
    </section>
  );
};
