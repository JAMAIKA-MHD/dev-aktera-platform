import { tint } from "../../theme/recipes";

// The strip above a timed game: what has been done so far against the goal, the time left as a
// bar (a number would be one more thing to read while playing) and the goal itself. Memory
// Match reads as one family with Hit It: same template look (games.hitIt.score and
// games.hitIt.timer → --xp-hit-score-*, --xp-hit-timer-*).

export interface RoundHudProps {
  score: string; // "3 / 6"
  goal: string; // "6 · 45s"
  leftMs: number;
  totalMs: number;
  reducedMotion: boolean;
  reached?: boolean; // the goal is met: the pill takes the accent
}

export function RoundHud({
  score,
  goal,
  leftMs,
  totalMs,
  reducedMotion,
  reached = false,
}: RoundHudProps) {
  const share = totalMs > 0 ? Math.min(1, Math.max(0, leftMs / totalMs)) : 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        data-xp-hit-score
        className="rounded-full border px-3 py-1 text-sm font-extrabold tabular-nums transition-colors"
        style={{
          borderColor: reached
            ? tint("--xp-accent", 70)
            : `var(--xp-hit-score-border, ${tint("--xp-primary", 55)})`,
          backgroundColor: reached
            ? tint("--xp-accent", 20)
            : "var(--xp-hit-score-bg, transparent)",
          color: "var(--xp-hit-score-text, inherit)",
          fontFamily: "var(--xp-hit-score-font, inherit)",
        }}
      >
        {score}
      </span>
      <span
        aria-hidden
        data-xp-hit-time
        data-xp-low={share <= 0.25 ? "" : undefined}
        className="xp-hit-time h-2 flex-1 overflow-hidden rounded-full"
        style={{
          backgroundColor: `var(--xp-hit-timer-track, ${tint("--xp-text", 12)})`,
        }}
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${(share * 100).toFixed(1)}%`,
            // The last quarter of the clock warns (.xp-hit-time[data-xp-low], games.css): the
            // template's own low color, else the accent.
            backgroundColor:
              share > 0.25
                ? "var(--xp-hit-timer-now)"
                : "var(--xp-hit-timer-low, var(--xp-accent))",
            transition: reducedMotion ? "none" : "width 120ms linear",
          }}
        />
      </span>
      <span className="text-xs font-bold text-[var(--xp-text-muted)] tabular-nums">
        {goal}
      </span>
    </div>
  );
}
