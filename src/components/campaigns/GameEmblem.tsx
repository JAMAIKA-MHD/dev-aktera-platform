// The emblem of a game: a two-tone drawing on a soft tile, in that game's colour family.
// It identifies the game only (never a status) and follows the theme through the
// `cx-g-<game>` classes of src/index.css.
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";
import type { GameType } from "./campaignMeta";

type GameKey = "wheel" | "scratch" | "mystery" | "hit" | "quiz";

const GAME_KEY: Record<GameType, GameKey> = {
  lucky_wheel: "wheel",
  scratch_card: "scratch",
  mystery_box: "mystery",
  hit_it: "hit",
  quiz: "quiz",
};

/** Sets the game's colours on an element: `cx-game`, `cx-game-mid`, `cx-game-soft`. */
export const gameColorClass = (gameType: GameType) =>
  `cx-g-${GAME_KEY[gameType] ?? "wheel"}`;

/** Banner pattern of the game: rings, hatch, dots, grid or stripes. */
export const gamePatternClass = (gameType: GameType) =>
  `cx-pat-${GAME_KEY[gameType] ?? "wheel"}`;

// The three fills of a drawing: strong, mid tone, and the surface for highlights.
const S = "fill-cx-game";
const M = "fill-cx-game-mid";
const W = "fill-cx-surface";
// The only outlines: the wheel's pointer and the target's cursor.
const OUTLINED = "fill-cx-surface stroke-cx-game [stroke-width:1.8]";
const SURFACE_LINE = "fill-none stroke-cx-surface";

const WHEEL_SLICES = [
  "M24 26L18.07 11.68A15.5 15.5 0 0 1 29.93 11.68Z",
  "M24 26L29.93 11.68A15.5 15.5 0 0 1 38.32 20.07Z",
  "M24 26L38.32 20.07A15.5 15.5 0 0 1 38.32 31.93Z",
  "M24 26L38.32 31.93A15.5 15.5 0 0 1 29.93 40.32Z",
  "M24 26L29.93 40.32A15.5 15.5 0 0 1 18.07 40.32Z",
  "M24 26L18.07 40.32A15.5 15.5 0 0 1 9.68 31.93Z",
  "M24 26L9.68 31.93A15.5 15.5 0 0 1 9.68 20.07Z",
  "M24 26L9.68 20.07A15.5 15.5 0 0 1 18.07 11.68Z",
];

// Drawn on a 48px grid.
const DRAWINGS: Record<GameKey, ReactNode> = {
  // Segmented wheel with its pointer.
  wheel: (
    <>
      <circle cx="24" cy="26" r="19" className={S} />
      {WHEEL_SLICES.map((d, index) => (
        <path key={d} d={d} className={index % 2 === 0 ? M : W} />
      ))}
      <circle cx="24" cy="26" r="5.2" className={W} />
      <circle cx="24" cy="26" r="2.4" className={S} />
      <path
        d="M24 13.5 19.6 4.8h8.8z"
        className={OUTLINED}
        strokeLinejoin="round"
      />
    </>
  ),
  // Tilted card with a scratched-away star.
  scratch: (
    <g transform="rotate(-8 24 24)">
      <rect x="6" y="10" width="36" height="28" rx="5.5" className={S} />
      <rect x="10.5" y="14.5" width="27" height="14" rx="3" className={M} />
      <path
        d="M13 26.5C17.5 19 22 25 26.5 18.5S33 19 35.5 17"
        className={SURFACE_LINE}
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity=".9"
      />
      <polygon
        points="31.00,20.10 32.12,22.96 35.18,23.14 32.81,25.09 33.59,28.06 31.00,26.40 28.41,28.06 29.19,25.09 26.82,23.14 29.88,22.96"
        className={S}
      />
      <rect
        x="10.5"
        y="32"
        width="13"
        height="2.4"
        rx="1.2"
        className={W}
        opacity=".75"
      />
      <rect
        x="26"
        y="32"
        width="6"
        height="2.4"
        rx="1.2"
        className={W}
        opacity=".45"
      />
    </g>
  ),
  // Gift box with its bow.
  mystery: (
    <>
      <rect x="9" y="23" width="30" height="17" rx="3.5" className={S} />
      <rect x="7" y="16.5" width="34" height="8.5" rx="3" className={M} />
      <rect x="21" y="16.5" width="6" height="23.5" className={W} />
      <path
        d="M24 14.5c-1.5-5-8.5-7.5-10-4s5 5.5 10 4zM24 14.5c1.5-5 8.5-7.5 10-4s-5 5.5-10 4z"
        className={SURFACE_LINE}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="14.5" r="2.8" className={W} />
    </>
  ),
  // Target with a cursor.
  hit: (
    <>
      <circle cx="22" cy="22" r="18" className={S} />
      <circle cx="22" cy="22" r="13" className={W} />
      <circle cx="22" cy="22" r="8.5" className={M} />
      <circle cx="22" cy="22" r="3.8" className={S} />
      <polygon
        points="29,28 29,43 33,39.2 36,45.5 39.2,44 36.2,38 41.5,37.6"
        className={OUTLINED}
        strokeLinejoin="round"
        transform="translate(-3 -3)"
      />
    </>
  ),
  // Speech bubble with a question mark and a check.
  quiz: (
    <>
      <rect x="6" y="8" width="36" height="27" rx="8" className={S} />
      <path d="M14 33l-1.5 8.5L23 34z" className={S} />
      <path
        d="M19.2 19.6a4.9 4.9 0 1 1 6.9 4.3c-1.4.7-2.1 1.5-2.1 3"
        className={SURFACE_LINE}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="30.2" r="2" className={W} />
      <circle
        cx="38.5"
        cy="9.5"
        r="7"
        className="fill-cx-game-mid stroke-cx-game-soft [stroke-width:2]"
      />
      <path
        d="M35.3 9.6l2.3 2.3 4.2-4.4"
        className={SURFACE_LINE}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

export function GameEmblem({
  gameType,
  size = 44,
  lifted = false,
  className,
}: {
  gameType: GameType;
  /** Side of the tile in pixels: 32, 44, 56, 60 or 96. */
  size?: number;
  /** Ringed with the surface colour, for an emblem that overlaps a card's banner. */
  lifted?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        gameColorClass(gameType),
        "grid shrink-0 place-items-center bg-cx-game-soft",
        lifted
          ? "shadow-[0_0_0_4px_var(--cx-surface),inset_0_0_0_1px_var(--cx-border)]"
          : "shadow-[inset_0_0_0_1px_var(--cx-border)]",
        className,
      )}
      style={{ width: size, height: size, borderRadius: size * 0.3 }}
    >
      <svg viewBox="0 0 48 48" className="size-4/5 overflow-visible">
        {DRAWINGS[GAME_KEY[gameType] ?? "wheel"]}
      </svg>
    </span>
  );
}
