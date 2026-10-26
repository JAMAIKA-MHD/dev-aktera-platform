import type { CSSProperties } from "react";
import type { GameType } from "../../domain/gameTypes";
import { useGameTheme } from "../../theme/GameTheme";
import type { ResolvedDecor } from "../../theme/themeAssets";
import { useLayoutMode } from "../layout/useLayoutMode";

// The stage of a themed page (shell.css): the theme's background for this game and screen,
// a veil over it, and its decorations — all from the theme.json, nothing drawn here. Pure
// decoration: hidden from screen readers, never in the way of a pointer, clipped to the
// screen, behind the 8-slot frame. It stays mounted across the journey, so only its mood
// changes from one screen to the next (a brighter stage on a win, a calmer one on a loss).
// The classic template has no stage: ThemeScope paints the brand's background instead.
//
// A decoration may belong to some screens only (each screen of a template dressed its own
// way), and may be drawn over the panel (a star overlapping the cloud's edge): those go in a
// second layer, above the frame, still pointer-transparent.

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface GameFrameProps {
  gameType: GameType;
  screen?: string; // "win", "lose"… the stage's mood, and the screen's own background
}

export function GameFrame({ gameType, screen }: GameFrameProps) {
  const { manifest, assets } = useGameTheme();
  const { density } = useLayoutMode();
  if (!assets) return null;
  const background = assets.background(gameType, screen);
  const mood =
    manifest?.stage.moods !== false && (screen === "win" || screen === "lose")
      ? screen
      : undefined;
  // Low screens keep their height for the texts: the corner decorations go.
  const shown = assets.decor
    .map((decor, index) => ({ decor, index }))
    .filter(
      ({ decor }) =>
        !(decor.hideWhenLow && density === "tight") &&
        (!decor.screens ||
          (screen !== undefined &&
            (decor.screens as readonly string[]).includes(screen))),
    );
  const front = shown.filter(({ decor }) => decor.front);
  return (
    <>
      <div aria-hidden className="xp-stage" data-xp-mood={mood}>
        <div
          className="xp-stage-image"
          style={
            background
              ? ({ "--xp-stage-image": `url("${background}")` } as Vars)
              : undefined
          }
        />
        <div className="xp-stage-veil" />
        {shown
          .filter(({ decor }) => !decor.front)
          .map(({ decor, index }) => (
            <Decor key={index} decor={decor} index={index} />
          ))}
      </div>
      {front.length > 0 && (
        <div aria-hidden className="xp-stage-front">
          {front.map(({ decor, index }) => (
            <Decor key={index} decor={decor} index={index} />
          ))}
        </div>
      )}
    </>
  );
}

function Decor({ decor, index }: { decor: ResolvedDecor; index: number }) {
  const style: Vars = {
    left: decor.left,
    right: decor.right,
    top: decor.top,
    bottom: decor.bottom,
    width: decor.width,
    height: decor.height,
    "--xp-decor-rotate": `${decor.rotate}deg`,
    "--xp-decor-opacity": decor.opacity,
    // Each one moves on its own beat, never all together.
    "--xp-decor-delay": `${-(index * 1.3).toFixed(1)}s`,
  };
  const painted = decor.tint !== undefined || decor.repeatX;
  if (painted) {
    style["--xp-decor-src"] = `url("${decor.url}")`;
    if (decor.tint) style["--xp-decor-tint"] = cssColor(decor.tint);
    return (
      <span
        className="xp-decor"
        data-xp-tint={decor.tint ? "" : undefined}
        data-xp-repeat={decor.repeatX ? "" : undefined}
        data-xp-motion={decor.motion}
        style={style}
      />
    );
  }
  return (
    <img
      src={decor.url}
      alt=""
      draggable={false}
      className="xp-decor"
      data-xp-motion={decor.motion}
      style={style}
    />
  );
}

// A decor's tint names a role ("@accent": the variable of the same name, so it follows the
// brand) or one of the theme's colors, already checked by the schema.
function cssColor(value: string): string {
  return value.startsWith("@") ? `var(--xp-${value.slice(1)})` : value;
}
