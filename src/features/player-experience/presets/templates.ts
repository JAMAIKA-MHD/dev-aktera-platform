import type { ThemeTokens } from "../domain/types";
import { TEMPLATE_IDS, type TemplateId } from "../domain/templates";
import { getThemeManifest } from "./themeManifests";

// The template library (domain/templates.ts) as the Studio lists it. Every template but the
// classic one is a theme.json (themes/<id>/): its label, description, fonts and palette are
// read from there, never repeated here. The runtime styles each one from the same file, as
// CSS variables (theme/shellVars.ts): no template has code or CSS of its own.
//
// Generic styles only: no template carries the name or identity of a real brand.

export interface TemplateFonts {
  display: string; // titles, the main button, the result headline
  ui: string; // labels, chips, the brand name, small capitals
  stylesheet: string; // Google Fonts, loaded in the runtime's own document only
}

export interface ExperienceTemplate {
  id: TemplateId;
  label: string; // Studio label (English)
  description: string;
  source: string | null; // folder of src/templates/ it was adapted from
  presetId: string | null; // its palette (themePresets.ts); null: the classic style presets
  fonts: TemplateFonts | null; // null: the brand's own font everywhere
  mode: ThemeTokens["mode"] | null; // null: the brand's own
}

const CLASSIC: ExperienceTemplate = {
  id: "eight-slot",
  label: "Classic",
  description:
    "Clean and calm: your colors on a soft background, styled by the presets below.",
  source: null,
  presetId: null,
  fonts: null,
  mode: null,
};

export const EXPERIENCE_TEMPLATES: readonly ExperienceTemplate[] =
  TEMPLATE_IDS.flatMap((id): ExperienceTemplate[] => {
    if (id === "eight-slot") return [CLASSIC];
    const manifest = getThemeManifest(id);
    // A theme.json that failed its schema is left out of the library (themes.test.ts).
    if (!manifest) return [];
    return [
      {
        id,
        label: manifest.label,
        description: manifest.description,
        source: manifest.source,
        presetId: id,
        fonts: {
          display: `"${manifest.fonts.display}"`,
          ui: `"${manifest.fonts.ui}"`,
          stylesheet: manifest.fonts.stylesheet,
        },
        mode: manifest.mode,
      },
    ];
  });

// Unknown ids fall back to the classic template, like themeFromPreset.
export function getTemplate(id: string | null | undefined): ExperienceTemplate {
  return EXPERIENCE_TEMPLATES.find((template) => template.id === id) ?? CLASSIC;
}

// The Studio label of a template id, as saved (an unknown one reads as the classic layout).
export function templateLabel(id: string | null | undefined): string {
  return getTemplate(id).label;
}

// A template that paints its own stage (every one with a theme.json).
export function hasStage(id: string | null | undefined): boolean {
  return getTemplate(id).presetId !== null;
}
