import {
  MIN_TEXT_CONTRAST,
  contrastRatio,
  ctaTextColor,
} from "../domain/contrast";
import type { ThemeTokens } from "../domain/types";
import { fontStack } from "./fonts";

// ThemeTokens → CSS custom properties, set on the runtime root by ThemeScope.
// Every color of the player screens derives from these variables (rules.md, D8): no
// component may hard-code a color. Transparencies use color-mix() on the variables.

export type CssVars = Record<`--xp-${string}`, string>;

interface RadiusScale {
  sm: string; // chips, small badges
  md: string; // cards, inputs
  lg: string; // large panels, game frame
  pill: string; // buttons and pills
}

export const RADIUS_SCALE: Readonly<
  Record<ThemeTokens["radius"], RadiusScale>
> = {
  sharp: { sm: "2px", md: "4px", lg: "6px", pill: "4px" },
  rounded: { sm: "8px", md: "12px", lg: "20px", pill: "16px" },
  pill: { sm: "10px", md: "16px", lg: "24px", pill: "9999px" },
};

const WHITE = "#FFFFFF";
const BLACK = "#000000";
const HEX6 = /^#[0-9a-f]{6}$/i;

// Mixes two #rrggbb colors: weight 0 gives `from`, weight 1 gives `to`.
export function mixHex(from: string, to: string, weight: number): string {
  if (!HEX6.test(from) || !HEX6.test(to)) return from;
  const channel = (hex: string, index: number) =>
    parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
  const mixed = [0, 1, 2].map((index) =>
    Math.round(
      channel(from, index) +
        (channel(to, index) - channel(from, index)) * weight,
    ),
  );
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

// The strongest mix (first weight) that keeps `ink` readable on it (WCAG AA).
function readableMix(
  base: string,
  toward: string,
  ink: string,
  weights: readonly number[],
): string {
  for (const weight of weights) {
    const color = mixHex(base, toward, weight);
    if (contrastRatio(ink, color) >= MIN_TEXT_CONTRAST) return color;
  }
  return base;
}

// Secondary text: the text color faded toward the surface, as far as contrast allows.
export function mutedTextColor(text: string, surface: string): string {
  let muted = text;
  for (const weight of [0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1]) {
    const color = mixHex(text, surface, weight);
    if (contrastRatio(color, surface) >= MIN_TEXT_CONTRAST) {
      muted = color;
      break;
    }
  }
  return muted;
}

// Status hues of the player screens (a valid field, an error), whatever the brand.
const SUCCESS = "#22C55E";
const DANGER = "#EF4444";

// A status color readable as text on the surface (WCAG AA): the hue, lightened on a dark
// surface or darkened on a light one, only as much as needed.
export function statusColor(base: string, surface: string): string {
  const toward =
    contrastRatio(WHITE, surface) > contrastRatio(BLACK, surface)
      ? WHITE
      : BLACK;
  for (const weight of [0, 0.15, 0.3, 0.45, 0.6]) {
    const color = mixHex(base, toward, weight);
    if (contrastRatio(color, surface) >= MIN_TEXT_CONTRAST) return color;
  }
  return mixHex(base, toward, 0.75);
}

export function tokensToCssVars(theme: ThemeTokens): CssVars {
  const { colors } = theme;
  // The runtime's button text uses the same rule as the design checks (T1.11).
  const onPrimary = ctaTextColor(theme);
  const radius = RADIUS_SCALE[theme.radius];
  return {
    "--xp-primary": colors.primary,
    "--xp-secondary": colors.secondary,
    "--xp-accent": colors.accent,
    "--xp-surface": colors.surface,
    "--xp-text": colors.text,
    "--xp-text-muted": mutedTextColor(colors.text, colors.surface),
    "--xp-on-primary": onPrimary,
    // Gradient stops of the primary button, kept readable under its text: this replaces
    // the prototype's hard-coded gold gradient (isGold) for every brand color.
    "--xp-primary-light": readableMix(
      colors.primary,
      WHITE,
      onPrimary,
      [0.45, 0.35, 0.25, 0.15, 0.08],
    ),
    "--xp-primary-deep": readableMix(
      colors.primary,
      BLACK,
      onPrimary,
      [0.2, 0.14, 0.08],
    ),
    // A valid field and an error, never shown by the color alone (D19).
    "--xp-success": statusColor(SUCCESS, colors.surface),
    "--xp-danger": statusColor(DANGER, colors.surface),
    "--xp-radius-sm": radius.sm,
    "--xp-radius-md": radius.md,
    "--xp-radius-lg": radius.lg,
    "--xp-radius-pill": radius.pill,
    "--xp-font": fontStack(theme.font),
  };
}
