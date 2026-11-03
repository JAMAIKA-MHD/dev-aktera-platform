import type { CSSProperties } from "react";

// Shared style recipes of the player screens, built on the theme variables only (D5, D8):
// the same button, glass and glow everywhere, for every brand color.
//
// Each recipe reads an optional skin variable first (--xp-btn-bg, --xp-card-border…), with
// the classic look as its fallback: a template's theme.json restyles a part through
// them (theme/shellVars.ts), set on the runtime root, without touching the components.

// color-mix() transparency of a theme variable: the only way the runtime makes a color
// transparent (plan §8.2).
export function tint(variable: `--xp-${string}`, percent: number): string {
  return `color-mix(in srgb, var(${variable}) ${percent}%, transparent)`;
}

// Primary button: brand gradient, readable text, deep shadow tinted with the brand color.
export const primaryButtonStyle: CSSProperties = {
  background:
    "var(--xp-btn-bg, linear-gradient(135deg, var(--xp-primary-light) 0%, var(--xp-primary) 50%, var(--xp-primary-deep) 100%))",
  color: "var(--xp-btn-text, var(--xp-on-primary))",
  border:
    "var(--xp-btn-border-width, 0px) solid var(--xp-btn-border, transparent)",
  borderRadius: "var(--xp-btn-radius, var(--xp-radius-pill))",
  boxShadow: `var(--xp-btn-shadow, 0 0.75rem 1.5rem -0.35rem ${tint("--xp-primary", 45)}, 0 0.25rem 0.6rem -0.2rem ${tint("--xp-surface", 60)})`,
};

// Frosted surface (header, cards) with an opaque fallback where backdrop-filter is missing:
// the background alone stays readable.
export const glassSurfaceStyle: CSSProperties = {
  backgroundColor: `var(--xp-hud-bg, ${tint("--xp-surface", 72)})`,
  backdropFilter: "blur(12px) saturate(140%)",
  WebkitBackdropFilter: "blur(12px) saturate(140%)",
  borderColor: `var(--xp-hud-border, ${tint("--xp-text", 10)})`,
};

// Soft card lifted from the background, bordered with a hint of the brand color.
export const cardStyle: CSSProperties = {
  backgroundColor: `var(--xp-card-bg, color-mix(in srgb, var(--xp-text) 5%, var(--xp-surface)))`,
  borderColor: `var(--xp-card-border, ${tint("--xp-text", 10)})`,
  borderWidth: "var(--xp-card-border-width, 1px)",
  borderRadius: "var(--xp-card-radius, var(--xp-radius-lg))",
  boxShadow: "var(--xp-card-shadow, none)",
};

// The border of a quiet, outlined control (secondary buttons, quiz options, share links).
export const OUTLINE = `var(--xp-outline, ${tint("--xp-text", 14)})`;

// Brand color pulled toward the text color: an ink that stays readable on a card or a
// glass surface, whatever the brand color (a pale yellow on white, a deep blue on navy).
export const BRAND_INK =
  "color-mix(in srgb, var(--xp-primary) 70%, var(--xp-text))";
