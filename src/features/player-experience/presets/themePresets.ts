import { TEMPLATE_IDS } from "../domain/templates";
import type { ThemeTokens } from "../domain/types";
import { getThemeManifest } from "./themeManifests";

export interface ThemePreset {
  id: string;
  label: string; // Studio label (English)
  tokens: Omit<ThemeTokens, "presetId">;
  // The palette of one template of the library (presets/templates.ts): applied with that
  // template, never listed among the styles of the classic layout.
  template?: true;
}

// Generic styles only: no preset may carry the name or the exact identity of a real brand.
const STYLES: readonly ThemePreset[] = [
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

// The palette of each template of the library, read from its theme.json: what the brand's
// theme starts from when the template is picked. Surface and text are those of the panel the
// texts sit on; the stage around it is the theme's own (runtime/shell/GameFrame).
const TEMPLATE_PALETTES: readonly ThemePreset[] = TEMPLATE_IDS.flatMap(
  (id): ThemePreset[] => {
    const manifest = getThemeManifest(id);
    if (!manifest) return [];
    const { ink: _ink, ...colors } = manifest.palette;
    return [
      {
        id,
        label: manifest.label,
        template: true,
        tokens: {
          mode: manifest.mode,
          colors,
          background: {
            kind: "solid",
            image: null,
            overlayOpacity: 0.85,
            focus: { x: 50, y: 50 },
          },
          radius: manifest.radius,
          font: manifest.font,
        },
      },
    ];
  },
);

export const THEME_PRESETS: readonly ThemePreset[] = [
  ...STYLES,
  ...TEMPLATE_PALETTES,
];

// The styles offered with the classic layout (the Template panel's preset grid).
export const STYLE_PRESETS: readonly ThemePreset[] = THEME_PRESETS.filter(
  (preset) => !preset.template,
);

export const DEFAULT_PRESET_ID = "midnight-gold";

// Unknown ids fall back to the default preset, so a stale presetId never breaks a theme.
export function themeFromPreset(presetId: string | undefined): ThemeTokens {
  const preset =
    THEME_PRESETS.find((candidate) => candidate.id === presetId) ??
    THEME_PRESETS.find((candidate) => candidate.id === DEFAULT_PRESET_ID)!;
  return structuredClone({ presetId: preset.id, ...preset.tokens });
}

// The preset a theme started from, whichever list it belongs to.
export function findPreset(presetId: string | null): ThemePreset | undefined {
  return THEME_PRESETS.find((candidate) => candidate.id === presetId);
}
