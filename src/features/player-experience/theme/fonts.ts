import type { ThemeTokens } from "../domain/types";

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

const STYLESHEETS: Readonly<Partial<Record<FontId, string>>> = {
  "plus-jakarta":
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
};

// Adds the stylesheet of a font that index.css does not load, once per document.
// Called by the runtime host, never by ThemeScope, which must not touch the document.
export function ensureFontStylesheet(doc: Document, font: FontId): void {
  const href = STYLESHEETS[font];
  if (!href) return;
  const id = `xp-font-${font}`;
  if (doc.getElementById(id)) return;
  const link = doc.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  doc.head.appendChild(link);
}
