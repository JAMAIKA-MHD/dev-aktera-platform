import { useEffect, useId, useState, type CSSProperties } from "react";
import type { GameType } from "../../domain/gameTypes";
import type { ThemePaint, ThemeStageFrame } from "../../domain/themeManifest";
import { useGameTheme } from "../../theme/GameTheme";
import {
  cssPolygon,
  dotsPattern,
  paintFor,
  raysGradient,
  svgPoints,
} from "../../theme/stagePaint";
import type { ResolvedDecor } from "../../theme/themeAssets";
import { useLayoutMode } from "../layout/useLayoutMode";
import { Flyers } from "./Flyers";

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
//
// A theme may paint its stage instead of a picture (stage.paint, stage.frame): a burst of rays
// in CSS and a cut-corner frame in vector, its own polygon on one column, its band and outline
// of the same thickness on every screen shape. Nothing stretched, nothing blurred.
//
// A theme's motion (motion in theme.json, motion.css) brings the stage to life: its painted
// rays turn slowly (a layer of their own, never the frame), a new sky fades in over the old
// one (blue to slate on a loss), the edges breathe (vignette). A device that cannot keep up
// drops all of that (data-xp-lite) and keeps what answers the player.

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface GameFrameProps {
  gameType: GameType;
  screen?: string; // "win", "lose"… the stage's mood, and the screen's own background
}

export function GameFrame({ gameType, screen }: GameFrameProps) {
  const { manifest, assets } = useGameTheme();
  const { density } = useLayoutMode();
  const lite = useStrugglingDevice(
    Boolean(manifest?.motion.rays) || (manifest?.motion.flyers.length ?? 0) > 0,
  );
  if (!assets) return null;
  const turning = Boolean(manifest?.motion.rays);
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
  const paint = manifest?.stage.paint;
  const frame = manifest?.stage.frame;
  const imageStyle: Vars | undefined = paint
    ? paintVars(paintFor(paint.sky, paint.screens, screen))
    : background
      ? { "--xp-stage-image": `url("${background}")` }
      : undefined;
  return (
    <>
      <div
        aria-hidden
        className="xp-stage"
        data-xp-mood={mood}
        data-xp-lite={lite ? "" : undefined}
        style={
          manifest && manifest.stage.decorScale !== 1
            ? ({ "--xp-decor-scale": manifest.stage.decorScale } as Vars)
            : undefined
        }
      >
        <div
          className="xp-stage-image"
          data-xp-painted={paint ? "" : undefined}
          style={imageStyle}
        >
          {paint && turning && (
            <TurningRays
              paint={raysGradient(
                paintFor(paint.sky, paint.screens, screen),
                cssColor,
              )}
            />
          )}
        </div>
        {frame && (
          <StageFrame frame={frame} screen={screen} turning={turning} />
        )}
        <div className="xp-stage-veil" />
        {manifest?.motion.vignette && <div className="xp-stage-vignette" />}
        {manifest?.motion.rain && screen === "lose" && (
          <div className="xp-stage-rain" />
        )}
        {!lite && assets.flyers.length > 0 && (
          <Flyers flyers={assets.flyers} screen={screen} />
        )}
        {shown
          .filter(({ decor }) => !decor.front)
          .map(({ decor, index }) => (
            <Decor key={index} decor={decor} index={index} />
          ))}
      </div>
      {front.length > 0 && (
        <div
          aria-hidden
          className="xp-stage-front"
          data-xp-lite={lite ? "" : undefined}
        >
          {front.map(({ decor, index }) => (
            <Decor key={index} decor={decor} index={index} />
          ))}
        </div>
      )}
    </>
  );
}

// The painted sky: its rays, and the halftone dots of its corners when it has some.
function paintVars(paint: ThemePaint): Vars {
  return {
    "--xp-stage-paint": raysGradient(paint, cssColor),
    ...(paint.dots
      ? { "--xp-stage-dots": dotsPattern(paint.dots, cssColor) }
      : {}),
  };
}

// The frame: its own sky inside the polygon, then its band and outline, both drawn inside the
// polygon only (clipped) at a constant width (non-scaling stroke), however the box stretches.
// Both polygons are drawn; shell.css shows the one of the arrangement.
function StageFrame({
  frame,
  screen,
  turning,
}: {
  frame: ThemeStageFrame;
  screen: string | undefined;
  turning: boolean; // the theme's rays turn (motion.rays)
}) {
  const id = useId().replace(/:/g, "");
  const style: Vars = {
    ...paintVars(paintFor(frame.sky, frame.screens, screen)),
    "--xp-frame-clip": cssPolygon(frame.stackPoints),
    "--xp-frame-clip-wide": cssPolygon(frame.points),
    "--xp-frame-band": cssColor(frame.band),
    "--xp-frame-band-width": frame.bandWidth,
    "--xp-frame-ink": cssColor(frame.ink),
    "--xp-frame-ink-width": frame.inkWidth,
  };
  const shapes = [
    ["stack", frame.stackPoints],
    ["wide", frame.points],
  ] as const;
  return (
    <div className="xp-stage-frame" style={style}>
      <div
        className="xp-stage-frame-sky"
        data-xp-turning={turning ? "" : undefined}
      >
        {turning && (
          <TurningRays
            paint={raysGradient(
              paintFor(frame.sky, frame.screens, screen),
              cssColor,
            )}
          />
        )}
      </div>
      {shapes.map(([kind, points]) => (
        <svg
          key={kind}
          className="xp-stage-frame-line"
          data-xp-frame={kind}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <clipPath id={`${id}-${kind}`}>
            <polygon points={svgPoints(points)} />
          </clipPath>
          <g clipPath={`url(#${id}-${kind})`}>
            {(["band", "ink"] as const).map((part) => (
              <polygon
                key={part}
                points={svgPoints(points)}
                data-xp-frame-part={part}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>
      ))}
    </div>
  );
}

// Where a decoration sits: its wide place, and on one column its own (stack), else the wide
// one at the stage's decorScale. shell.css picks one or the other.
function Decor({ decor, index }: { decor: ResolvedDecor; index: number }) {
  const side = (value: string | undefined) => value ?? "auto";
  const stack = decor.stack;
  const style: Vars = {
    "--xp-decor-left": side(decor.left),
    "--xp-decor-right": side(decor.right),
    "--xp-decor-top": side(decor.top),
    "--xp-decor-bottom": side(decor.bottom),
    "--xp-decor-width": decor.width,
    "--xp-decor-left-stack": side(stack ? stack.left : decor.left),
    "--xp-decor-right-stack": side(stack ? stack.right : decor.right),
    "--xp-decor-top-stack": side(stack ? stack.top : decor.top),
    "--xp-decor-bottom-stack": side(stack ? stack.bottom : decor.bottom),
    "--xp-decor-width-stack": stack
      ? stack.width
      : `calc(${decor.width} * var(--xp-decor-scale, 1))`,
    height: decor.height,
    "--xp-decor-rotate": `${decor.rotate}deg`,
    "--xp-decor-opacity": decor.opacity,
    // Each one moves on its own beat and at its own pace, never all together, and pops in at
    // its own moment when the scene assembles (motion.entrance).
    "--xp-decor-delay": `${-(index * 1.3).toFixed(1)}s`,
    "--xp-decor-speed": (1 + (index % 5) * 0.13).toFixed(2),
    "--xp-decor-enter": `${120 + ((index * 97) % 420)}ms`,
  };
  // Crossing the screen on the wind: where it was placed is where it is at first.
  if (decor.motion === "wind") {
    const seconds = decor.seconds ?? 80;
    const phase = windPhase(decor, index);
    style["--xp-decor-seconds"] = `${seconds}s`;
    style["--xp-decor-delay"] = `${-(phase * seconds).toFixed(1)}s`;
    // Where it stands across the screen: the crossing is drawn from there (motion.css), and
    // a still stage (reduced motion) leaves it in its own place.
    style["--xp-wind-from"] = `${(phase * 100).toFixed(1)}vw`;
  } else if (decor.seconds) {
    style["--xp-decor-seconds"] = `${decor.seconds}s`;
  }
  // A sprite sheet, played frame by frame.
  if (decor.sprite) {
    style["--xp-decor-src"] = `url("${decor.url}")`;
    style["--xp-sprite-frames"] = decor.sprite.frames;
    style["--xp-sprite-seconds"] =
      `${(decor.sprite.frames / decor.sprite.fps).toFixed(3)}s`;
    style.aspectRatio = String(decor.sprite.aspect);
    return (
      <span
        className="xp-decor"
        data-xp-sprite
        data-xp-motion={decor.motion}
        data-xp-wide-only={decor.wideOnly ? "" : undefined}
        style={style}
      />
    );
  }
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
        data-xp-wide-only={decor.wideOnly ? "" : undefined}
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
      data-xp-wide-only={decor.wideOnly ? "" : undefined}
      style={style}
    />
  );
}

// How far across the screen a wind-borne decoration starts (0 to 1): its own place, when it
// is given in percent, else one spread out by its rank.
function windPhase(decor: ResolvedDecor, index: number): number {
  const percent = (value: string | undefined) =>
    value && /^-?[0-9.]+%$/.test(value.trim()) ? parseFloat(value) / 100 : null;
  const left = percent(decor.left);
  if (left !== null) return Math.min(1, Math.max(0, left));
  const right = percent(decor.right);
  if (right !== null) return Math.min(1, Math.max(0, 1 - right));
  return (index * 0.37) % 1;
}

// A decor's tint names a role ("@accent": the variable of the same name, so it follows the
// brand) or one of the theme's colors, already checked by the schema.
function cssColor(value: string): string {
  return value.startsWith("@") ? `var(--xp-${value.slice(1)})` : value;
}

// The painted rays on a layer of their own, turning (motion.css): a square as wide as the
// screen's diagonal, so that no corner ever shows as it turns. A new sky (a loss) fades in
// over the old one, which goes once it is covered.
const SKY_FADE_MS = 500;

function TurningRays({ paint }: { paint: string }) {
  const [layers, setLayers] = useState<{ current: string; old: string | null }>(
    { current: paint, old: null },
  );
  if (layers.current !== paint)
    setLayers({ current: paint, old: layers.current });
  useEffect(() => {
    if (layers.old === null) return;
    const timer = setTimeout(
      () => setLayers((now) => ({ ...now, old: null })),
      SKY_FADE_MS,
    );
    return () => clearTimeout(timer);
  }, [layers.old]);
  return (
    <>
      {layers.old !== null && (
        <span className="xp-stage-rays" style={{ background: layers.old }} />
      )}
      <span
        key={layers.current}
        className="xp-stage-rays"
        data-xp-fresh={layers.old !== null ? "" : undefined}
        style={{ background: layers.current }}
      />
    </>
  );
}

// A device that drops frames (a mid-range phone): over its first second and a half, the
// stage measures the time between frames, and gives up its ambient motion when they come
// slower than about 30 a second. Only once, only when the theme has ambient motion at all.
const SAMPLE_MS = 1500;
const SLOW_FRAME_MS = 34;

function useStrugglingDevice(ambient: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!ambient || typeof requestAnimationFrame !== "function") return;
    const gaps: number[] = [];
    let first: number | null = null;
    let previous: number | null = null;
    let frame = 0;
    const step = (now: number) => {
      first ??= now;
      if (previous !== null) gaps.push(now - previous);
      previous = now;
      if (now - first < SAMPLE_MS) {
        frame = requestAnimationFrame(step);
        return;
      }
      // A hidden page gives no frame at all: too few to judge, never "slow".
      if (gaps.length < 20) return;
      const sorted = [...gaps].sort((a, b) => a - b);
      if (sorted[Math.floor(sorted.length / 2)]! > SLOW_FRAME_MS) setSlow(true);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [ambient]);
  return slow;
}
