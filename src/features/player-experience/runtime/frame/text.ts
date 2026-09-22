// Arabic letters join: letter spacing and small caps would break the words apart (D6).
// The script is read from the text itself, not from the locale: a missing Arabic
// translation falls back to French, and a brand name can be Arabic on a French screen.
// Arabic, Arabic Supplement, Arabic Extended-A and the two presentation-forms blocks.
const ARABIC_SCRIPT =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// First strong character, as dir="auto" reads it: a right-to-left letter (Hebrew, Arabic)
// or a Latin one. Digits (Western and Arabic-Indic) are weak and skipped.
const FIRST_STRONG =
  /[A-Za-z\u00C0-\u024F]|[\u0590-\u065F\u066A-\u06EF\u06FA-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function isArabicScript(text: string): boolean {
  return ARABIC_SCRIPT.test(text);
}

// Tracking and capitals for Latin labels only.
export function spacedCaps(text: string, latinClasses: string): string {
  return isArabicScript(text) ? "" : latinClasses;
}

// Direction that dir="auto" gives the text; null when it has no strong character.
export function textDirection(text: string): "ltr" | "rtl" | null {
  const first = FIRST_STRONG.exec(text);
  if (!first) return null;
  return /[A-Za-z\u00C0-\u024F]/.test(first[0]) ? "ltr" : "rtl";
}

// A dir="auto" text aligns on its own start. When its script reads the other way than the
// screen (a Latin brand name on an Arabic screen), its end is the screen's start.
export function startsOnScreenSide(
  text: string,
  screenDirection: "ltr" | "rtl",
): boolean {
  const direction = textDirection(text);
  return direction === null || direction === screenDirection;
}
