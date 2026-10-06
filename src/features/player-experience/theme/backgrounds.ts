import type { CSSProperties } from "react";
import type { ThemeTokens } from "../domain/types";

// Page backgrounds, from the prototype's SlotContainer (solid, gradient, mesh, dots, brand
// image), rebuilt on the CSS variables of tokens.ts: no color is written here, only
// var(--xp-…) and color-mix(), so a theme change recolors the background instantly.

const tint = (variable: string, percent: number) =>
  `color-mix(in srgb, var(${variable}) ${percent}%, transparent)`;

const LAYERS: Readonly<
  Record<Exclude<ThemeTokens["background"]["kind"], "image">, CSSProperties>
> = {
  solid: { backgroundColor: "var(--xp-surface)" },
  // A glow of the brand color from the top, fading into the surface.
  gradient: {
    backgroundColor: "var(--xp-surface)",
    backgroundImage: `radial-gradient(130% 80% at 50% -10%, ${tint("--xp-primary", 26)} 0%, transparent 62%)`,
  },
  // Several soft lights (primary on top, secondary and accent at the bottom corners):
  // the look of the Midnight Gold reference screen.
  mesh: {
    backgroundColor: "var(--xp-surface)",
    backgroundImage: [
      `radial-gradient(120% 70% at 50% -12%, ${tint("--xp-primary", 30)} 0%, transparent 60%)`,
      `radial-gradient(70% 55% at 100% 105%, ${tint("--xp-secondary", 16)} 0%, transparent 70%)`,
      `radial-gradient(60% 50% at -5% 85%, ${tint("--xp-accent", 12)} 0%, transparent 70%)`,
    ].join(", "),
  },
  dots: {
    backgroundColor: "var(--xp-surface)",
    backgroundImage: `radial-gradient(${tint("--xp-primary", 22)} 1px, transparent 1px)`,
    backgroundSize: "16px 16px",
  },
};

// imageUrl: the background image, already resolved by AssetStorage.resolveUrl.
// An image background without a usable image falls back to the gradient.
export function backgroundStyle(
  theme: ThemeTokens,
  imageUrl: string | null,
): CSSProperties {
  const { kind, overlayOpacity, focus } = theme.background;
  if (kind !== "image") return LAYERS[kind];
  if (!imageUrl) return LAYERS.gradient;
  // A veil of the surface color keeps the text readable over any photo.
  const veil = tint("--xp-surface", Math.round(overlayOpacity * 100));
  return {
    backgroundColor: "var(--xp-surface)",
    backgroundImage: `linear-gradient(${veil}, ${veil}), url(${JSON.stringify(imageUrl)})`,
    backgroundSize: "cover",
    // The point of interest stays visible whatever the crop (portrait or landscape).
    backgroundPosition: `${focus.x}% ${focus.y}%`,
    backgroundRepeat: "no-repeat",
  };
}
