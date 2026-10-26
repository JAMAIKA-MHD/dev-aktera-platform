import React from "react";
import { AlertTriangle } from "lucide-react";
import type { CodeCounts } from "../../lib/codeExpiry";

interface CodeStockSummaryProps {
  counts: CodeCounts;
  /** Wins the campaigns still expect from this reward (allocated minus already won). */
  remainingToWin: number;
}

// What is left to give for a digital reward, and a warning before the codes run out. The date of
// all the codes at once is set from the reward form (Edit). The database remains the only judge
// of what a winner receives.
export const CodeStockSummary: React.FC<CodeStockSummaryProps> = ({
  counts,
  remainingToWin,
}) => {
  const total = counts.available + counts.used + counts.expired;

  const exhausted = total > 0 && counts.available === 0;
  const runningShort =
    !exhausted && total > 0 && remainingToWin > counts.available;

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
    </section>
  );
};
