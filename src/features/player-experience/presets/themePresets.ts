import type { ThemeTokens } from "../domain/types";

export interface ThemePreset {
  id: string;
  label: string; // Studio label (English)
  tokens: Omit<ThemeTokens, "presetId">;
}

// Generic styles only: no preset may carry the name or the exact identity of a real brand.
export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    // Reference design of the welcome screen (rules.md, D4).
    id: "midnight-gold",
    label: "Midnight Gold",
    tokens: {
      mode: "dark",
      colors: {
        primary: "#F5BA41",
        secondary: "#FBBF24",
        accent: "#10B981",
        surface: "#0A1120",
        text: "#FFFFFF",
      },
      background: {
        kind: "mesh",
        image: null,
        overlayOpacity: 0.85,
        focus: { x: 50, y: 50 },
      },
      radius: "pill",
      font: "poppins",
    },
  },
  {
    id: "obsidian-violet",
    label: "Obsidian Violet",
    tokens: {
      mode: "dark",
      colors: {
        // #7C3AED rather than the prototype's #8B5CF6: button text reaches 5.7:1 (4.2:1 before).
        primary: "#7C3AED",
        secondary: "#EC4899",
        accent: "#06B6D4",
        surface: "#0F172A",
        text: "#FFFFFF",
      },
      background: {
        kind: "gradient",
        image: null,
        overlayOpacity: 0.85,
        focus: { x: 50, y: 50 },
      },
      radius: "rounded",
      font: "poppins",
    },
  },
  {
    id: "clean-light",
    label: "Clean Light",
    tokens: {
      mode: "light",
      colors: {
        primary: "#4F46E5",
        secondary: "#06B6D4",
        accent: "#10B981",
        surface: "#FFFFFF",
        text: "#0F172A",
      },
      background: {
        kind: "solid",
        image: null,
        overlayOpacity: 0.85,
        focus: { x: 50, y: 50 },
      },
      radius: "rounded",
      font: "plus-jakarta",
    },
  },
  {
    id: "telecom-red",
    label: "Telecom Red",
    tokens: {
      mode: "dark",
      colors: {
        primary: "#E11D48",
        secondary: "#BE123C",
        accent: "#FBBF24",
        surface: "#14080B",
        text: "#FFFFFF",
      },
      background: {
        kind: "mesh",
        image: null,
        overlayOpacity: 0.85,
        focus: { x: 50, y: 50 },
      },
      radius: "rounded",
      font: "poppins",
    },
  },
  {
    id: "retail-blue",
    label: "Retail Blue",
    tokens: {
      mode: "light",
      colors: {
        primary: "#2563EB",
        secondary: "#EAB308",
        accent: "#DC2626",
        surface: "#F8FAFC",
        text: "#0F172A",
      },
      background: {
        kind: "gradient",
        image: null,
        overlayOpacity: 0.85,
        focus: { x: 50, y: 50 },
      },
      radius: "rounded",
      font: "poppins",
    },
  },
];

export const DEFAULT_PRESET_ID = "midnight-gold";

// Unknown ids fall back to the default preset, so a stale presetId never breaks a theme.
export function themeFromPreset(presetId: string | undefined): ThemeTokens {
  const preset =
    THEME_PRESETS.find((candidate) => candidate.id === presetId) ??
    THEME_PRESETS.find((candidate) => candidate.id === DEFAULT_PRESET_ID)!;
  return structuredClone({ presetId: preset.id, ...preset.tokens });
}
