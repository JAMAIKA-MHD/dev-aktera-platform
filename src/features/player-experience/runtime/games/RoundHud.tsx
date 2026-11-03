import { tint } from "../../theme/recipes";

// The strip above a timed game: what has been done so far against the goal, the time left as a
// bar (a number would be one more thing to read while playing) and the goal itself. Shared by
// the three newer skill games, so they read as one family next to Hit It.

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
          borderColor: tint(reached ? "--xp-accent" : "--xp-primary", 55),
          backgroundColor: reached ? tint("--xp-accent", 20) : "transparent",
        }}
      >
        {score}
      </span>
      <span
        aria-hidden
        data-xp-hit-time
        className="h-2 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: tint("--xp-text", 12) }}
      >
        <span
          className="block h-full rounded-full"
          style={{
            width: `${(share * 100).toFixed(1)}%`,
            // The last quarter of the clock warns, without a second color to learn.
            backgroundColor:
              share > 0.25 ? "var(--xp-primary)" : "var(--xp-accent)",
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
