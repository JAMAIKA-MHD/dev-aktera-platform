import type { CSSProperties } from "react";
import type { MOTION_WORDS } from "../../domain/themeManifest";
import { useGameTheme } from "../../theme/GameTheme";

// A comic word ("POW!", "BOOM!", "WOW!") popping in with a twist, then fading out
// (motion.css, .xp-fx-word): the theme's own (motion.words), at a moment of the game. Pure
// decoration, never read out, never in the way of a pointer. Placed by its caller: at a point
// of a game's own box (x, y in percent), or over the screen (`over`).

export type ComicMoment = (typeof MOTION_WORDS)[number];

export function useComicWord(moment: ComicMoment): string | null {
  return useGameTheme().manifest?.motion.words[moment] ?? null;
}

export function ComicWord({
  word,
  x = 50,
  y = 30,
  over = false,
  tilt = -8,
}: {
  word: string;
  x?: number;
  y?: number;
  over?: boolean; // over the whole screen rather than inside its caller's box
  tilt?: number; // degrees
}) {
  return (
    <span
      aria-hidden
      className="xp-fx-word"
      data-xp-over={over ? "" : undefined}
      style={
        {
          insetInlineStart: `${x}%`,
          top: `${y}%`,
          "--xp-fx-word-tilt": `${tilt}deg`,
        } as CSSProperties
      }
    >
      {word}
    </span>
  );
}
