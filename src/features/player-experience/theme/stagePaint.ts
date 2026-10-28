import type { ThemePaint, ThemeStageFrame } from "../domain/themeManifest";

// The stage a theme paints instead of a picture (stage.paint, stage.frame): a burst of rays in
// CSS and a frame in vector, both sharp at any size and on any screen shape. Pure: the shell
// (GameFrame) and the Studio's thumbnails build their styles from here.

// How wide each color's ray is in one turn of the pattern: the first the widest.
const WEIGHTS: Readonly<Record<number, readonly number[]>> = {
  2: [0.5, 0.5],
  3: [0.5, 0.3, 0.2],
  4: [0.4, 0.25, 0.2, 0.15],
};

// A ray's edge blurred over a fraction of a degree: a hard conic edge shows stairs.
const SOFT_EDGE = 0.2;

// The rays as a repeating-conic-gradient, from the centre of the box. `color` turns a theme
// color (a role "@primary" or a hex) into the CSS it is written with.
export function raysGradient(
  paint: ThemePaint,
  color: (value: string) => string,
): string {
  const period = 360 / paint.count;
  const weights = WEIGHTS[paint.rays.length] ?? WEIGHTS[2]!;
  let start = 0;
  const stops = paint.rays.map((ray, index) => {
    const end = start + period * weights[index]!;
    const from = index === 0 ? 0 : start + SOFT_EDGE;
    const stop = `${color(ray)} ${round(from)}deg ${round(end)}deg`;
    start = end;
    return stop;
  });
  return `repeating-conic-gradient(from 0deg at 50% 50%, ${stops.join(", ")})`;
}

// Halftone dots, one cell per --xp-dots-size, for the corners of the stage.
export function dotsPattern(dots: string, color: (value: string) => string) {
  return `radial-gradient(circle, ${color(dots)} 0 30%, transparent 34%)`;
}

// The paint of a screen: its own (a brighter sky on a win), else the default one.
export function paintFor(
  base: ThemePaint,
  screens: Partial<Record<"win" | "lose", ThemePaint>>,
  screen: string | undefined,
): ThemePaint {
  return (
    (screen === "win" || screen === "lose" ? screens[screen] : undefined) ??
    base
  );
}

// The frame's polygon, as CSS clip-path and as SVG points (a 100 × 100 box).
export function cssPolygon(points: ThemeStageFrame["points"]): string {
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
}

export function svgPoints(points: ThemeStageFrame["points"]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
