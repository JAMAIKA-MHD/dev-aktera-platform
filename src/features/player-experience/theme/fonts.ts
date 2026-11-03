import type { TemplateId } from "../domain/templates";
import type { ThemeTokens } from "../domain/types";
import { getThemeManifest } from "../presets/themeManifests";

// Font stacks of the player screens. Noto Sans Arabic is always in the stack (N5): Latin
// fonts have no Arabic glyphs, so Arabic text falls back to it, letter by letter.
// Poppins and Noto Sans Arabic are already loaded by src/index.css; Plus Jakarta Sans is
// loaded on demand, in the runtime's own document (ensureFontStylesheet).

export type FontId = ThemeTokens["font"];

const LATIN_FAMILY: Readonly<Record<FontId, string>> = {
  poppins: '"Poppins"',
  "plus-jakarta": '"Plus Jakarta Sans"',
};

const ARABIC_FAMILY = '"Noto Sans Arabic"';

export function fontStack(font: FontId): string {
  return `${LATIN_FAMILY[font]}, ${ARABIC_FAMILY}, system-ui, sans-serif`;
}

// A theme's display or ui family (its theme.json), with the same Arabic fallback.
export function templateFontStack(family: string): string {
  return `${family}, ${ARABIC_FAMILY}, system-ui, sans-serif`;
}

const STYLESHEETS: Readonly<Partial<Record<FontId, string>>> = {
  "plus-jakarta":
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
};

// Adds the stylesheet of a font that index.css does not load, once per document.
// Called by the runtime host, never by ThemeScope, which must not touch the document.
export function ensureFontStylesheet(doc: Document, font: FontId): void {
  const href = STYLESHEETS[font];
  if (href) addStylesheet(doc, `xp-font-${font}`, href);
}

// The fonts of a template's theme.json, under the same rules as ensureFontStylesheet.
export function ensureTemplateFonts(
  doc: Document,
  templateId: TemplateId,
): void {
  const fonts = getThemeManifest(templateId)?.fonts;
  if (fonts) addStylesheet(doc, `xp-template-${templateId}`, fonts.stylesheet);
}

function addStylesheet(doc: Document, id: string, href: string): void {
  if (doc.getElementById(id)) return;
  const link = doc.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  doc.head.appendChild(link);
}
