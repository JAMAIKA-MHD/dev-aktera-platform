import type { Locale } from "../../domain/locale";
import { useStudio } from "../StudioContext";

// The language tabs of every text field follow the preview: typing the Arabic title shows
// the screen in Arabic, and switching the preview to English opens the English tabs.
export function useTextLocale(): {
  locales: readonly Locale[];
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
} {
  const locales = useStudio((state) => state.config.locales.enabled);
  const locale = useStudio((state) => state.ui.locale);
  const onLocaleChange = useStudio((state) => state.setLocale);
  return { locales, locale, onLocaleChange };
}
