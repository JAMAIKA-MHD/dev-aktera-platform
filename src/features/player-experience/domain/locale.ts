export type Locale = "fr" | "ar" | "en";

export const LOCALES: readonly Locale[] = ["fr", "ar", "en"];

export type LocalizedText = Partial<Record<Locale, string>>;

// Whitespace-only values count as missing, so a field left with spaces falls back like an empty one.
function isFilled(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}

export function hasText(
  text: LocalizedText | undefined,
  locale: Locale,
): boolean {
  return isFilled(text?.[locale]);
}

// Fallback chain: requested locale → configured default → fr → en → any remaining locale.
// Never returns undefined: a text missing everywhere resolves to "".
export function resolveText(
  text: LocalizedText | undefined,
  locale: Locale,
  fallback?: Locale,
): string {
  if (!text) return "";
  const chain: Locale[] = fallback ? [locale, fallback] : [locale];
  chain.push("fr", "en", ...LOCALES);
  for (const candidate of chain) {
    const value = text[candidate];
    if (isFilled(value)) return value;
  }
  return "";
}

export function missingLocales(
  text: LocalizedText | undefined,
  enabled: readonly Locale[],
): Locale[] {
  return enabled.filter((locale) => !hasText(text, locale));
}

// The language a player sees first (backend task B5.2): the first language of their phone that
// the brand enabled ("ar-DZ" → ar), else the brand's default.
export function pickInitialLocale(
  locales: { default: Locale; enabled: readonly Locale[] },
  browserLanguages: readonly string[],
): Locale {
  for (const language of browserLanguages) {
    const base = language.toLowerCase().split("-")[0];
    const match = locales.enabled.find((locale) => locale === base);
    if (match) return match;
  }
  return locales.default;
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

// Builds preset content without undefined keys, so it serializes to clean JSON.
export function localized(fr: string, ar?: string, en?: string): LocalizedText {
  const text: LocalizedText = { fr };
  if (ar !== undefined) text.ar = ar;
  if (en !== undefined) text.en = en;
  return text;
}
