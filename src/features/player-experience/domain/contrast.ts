import type { ThemeTokens } from "./types";

// WCAG 2.x contrast, for the design checks and for the runtime's choice of text colors.

export const MIN_TEXT_CONTRAST = 4.5; // WCAG AA, normal text

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function channels(hex: string): [number, number, number] | null {
  if (!HEX.test(hex)) return null;
  const digits =
    hex.length === 4
      ? [...hex.slice(1)].map((digit) => digit + digit).join("")
      : hex.slice(1);
  const value = parseInt(digits, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// Relative luminance, from 0 (black) to 1 (white). NaN for anything but #rgb / #rrggbb.
export function relativeLuminance(hex: string): number {
  const rgb = channels(hex);
  if (!rgb) return Number.NaN;
  const [r, g, b] = rgb.map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// From 1 (same color) to 21 (black on white), order-independent. Truncated to 2 decimals and
// never rounded up: 4.496 stays below 4.5, as WCAG requires. NaN if a color is invalid.
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return Math.floor(ratio * 100 + 1e-9) / 100;
}

// The most readable of the candidate colors on a background (the first one on a tie).
export function mostReadable(
  background: string,
  candidates: readonly string[],
): string {
  return candidates.reduce((best, candidate) =>
    contrastRatio(candidate, background) > contrastRatio(best, background)
      ? candidate
      : best,
  );
}

// Text color of the primary button: the theme text or surface color, whichever reads better.
// The runtime uses the same rule, so what the check measures is what the player sees.
export function ctaTextColor(theme: ThemeTokens): string {
  return mostReadable(theme.colors.primary, [
    theme.colors.text,
    theme.colors.surface,
  ]);
}
