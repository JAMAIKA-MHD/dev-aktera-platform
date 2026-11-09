import { TimerOff } from "lucide-react";

// The badge between the two sides of a duel, and its clock: where the player is already
// looking. A ring around the "VS" empties like a clock hand sweeping round; in the last
// seconds it turns to the template's low color and the "VS" gives way to a big 3, 2, 1 that
// beats; when the time is up the badge shakes on a crossed-out timer. Its colors are the
// template's timer (games.hitIt.timer: the one of its other timed game), else the round bar's.

export interface ChoiceClockProps {
  /** The badge's width, in px; it fits the gap between the two cards. */
  size: number;
  /** The duel's clock, or nothing outside the player's turn (a plain "VS"). */
  clock: { leftMs: number; totalMs: number; low: boolean } | null;
  /** The time ran out on this duel: no one chose. */
  timedOut: boolean;
}

export function ChoiceClock({ size, clock, timedOut }: ChoiceClockProps) {
  const seconds = clock ? Math.ceil(clock.leftMs / 1000) : 0;
  // Drawn as the part already spent: the arc's start moves clockwise, its end stays at noon.
  const spent = clock
    ? Math.min(1, Math.max(0, 1 - clock.leftMs / clock.totalMs))
    : 0;
  const low = Boolean(clock?.low) && !timedOut;
  return (
    <span
      className="xp-choice-clock"
      data-xp-timing={clock ? "" : undefined}
      data-xp-low={low ? "" : undefined}
      data-xp-timeout={timedOut ? "" : undefined}
      style={{ width: size }}
    >
      {clock && (
        <svg viewBox="0 0 100 100" aria-hidden className="xp-choice-ring">
          <circle cx="50" cy="50" r="45" className="xp-choice-ring-track" />
          <circle
            cx="50"
            cy="50"
            r="45"
            pathLength={100}
            className="xp-choice-ring-fill"
            style={{
              strokeDashoffset: (-spent * 100).toFixed(2),
              opacity: spent >= 1 ? 0 : 1,
            }}
          />
        </svg>
      )}
      <span className="xp-choice-vs" aria-hidden>
        {timedOut ? (
          <TimerOff className="size-[52%]" strokeWidth={2.6} />
        ) : low ? (
          // A new key each second: each number comes in with its own beat.
          <span key={seconds} className="xp-choice-second">
            {seconds}
          </span>
        ) : (
          "VS"
        )}
      </span>
      {/* For screen readers only: a cut the layout intends. */}
      {clock && (
        <span role="timer" data-xp-clamp className="sr-only">
          {seconds} s
        </span>
      )}
    </span>
  );
}
