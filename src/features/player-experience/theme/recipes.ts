import type { CSSProperties } from "react";

// Shared style recipes of the player screens, built on the theme variables only (D5, D8):
// the same button, glass and glow everywhere, for every brand color.

// color-mix() transparency of a theme variable: the only way the runtime makes a color
// transparent (plan §8.2).
export function tint(variable: `--xp-${string}`, percent: number): string {
  return `color-mix(in srgb, var(${variable}) ${percent}%, transparent)`;
}

// Primary button: brand gradient, readable text, deep shadow tinted with the brand color.
export const primaryButtonStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, var(--xp-primary-light) 0%, var(--xp-primary) 50%, var(--xp-primary-deep) 100%)",
  color: "var(--xp-on-primary)",
  borderRadius: "var(--xp-radius-pill)",
  boxShadow: `0 0.75rem 1.5rem -0.35rem ${tint("--xp-primary", 45)}, 0 0.25rem 0.6rem -0.2rem ${tint("--xp-surface", 60)}`,
};

// Frosted surface (header, cards) with an opaque fallback where backdrop-filter is missing:
// the background alone stays readable.
export const glassSurfaceStyle: CSSProperties = {
  backgroundColor: tint("--xp-surface", 72),
  backdropFilter: "blur(12px) saturate(140%)",
  WebkitBackdropFilter: "blur(12px) saturate(140%)",
  borderColor: tint("--xp-text", 10),
};

// Soft card lifted from the background, bordered with a hint of the brand color.
export const cardStyle: CSSProperties = {
  backgroundColor: `color-mix(in srgb, var(--xp-text) 5%, var(--xp-surface))`,
  borderColor: tint("--xp-text", 10),
  borderRadius: "var(--xp-radius-lg)",
};
