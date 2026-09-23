import { LOCALES, type Locale } from "../../domain/locale";
import { SelectField } from "../fields/SelectField";
import { ToggleField } from "../fields/ToggleField";
import { useStudio } from "../StudioContext";
import { PanelIssues, PanelSection } from "./PanelLayout";

// Which languages players are offered, and which one they get first (plan §9.2, Content).
// The default language is always offered: it is the fallback of every missing translation.

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "French",
  ar: "Arabic",
  en: "English",
};

export function LanguagesSection() {
  const locales = useStudio((state) => state.config.locales);
  const previewLocale = useStudio((state) => state.ui.locale);
  const updateConfig = useStudio((state) => state.updateConfig);
  const setLocale = useStudio((state) => state.setLocale);

  const toggle = (locale: Locale, on: boolean) => {
    // Kept in the fixed fr, ar, en order, whatever the order of the clicks.
    const enabled = LOCALES.filter((candidate) =>
      candidate === locale ? on : locales.enabled.includes(candidate),
    );
    updateConfig({ locales: { ...locales, enabled } });
    if (!on && previewLocale === locale) setLocale(locales.default);
  };

  return (
    <PanelSection
      title="Languages"
      description="Players switch language on every screen; missing texts fall back to the default."
    >
      <PanelIssues prefixes={["locales"]} />
      <div className="divide-y divide-card-border">
        {LOCALES.map((locale) => {
          const isDefault = locale === locales.default;
          return (
            <ToggleField
              key={locale}
              label={`${LOCALE_LABELS[locale]}${isDefault ? " (default)" : ""}`}
              checked={locales.enabled.includes(locale)}
              onChange={(on) => toggle(locale, on)}
              disabled={isDefault}
              disabledReason="The default language is always offered"
              path={`locales.enabled.${locale}`}
            />
          );
        })}
      </div>
      <SelectField
        label="Default language"
        path="locales.default"
        value={locales.default}
        onChange={(fallback) =>
          updateConfig({ locales: { ...locales, default: fallback } })
        }
        options={locales.enabled.map((locale) => ({
          value: locale,
          label: LOCALE_LABELS[locale],
        }))}
        hint="Shown first, and used whenever a text is missing in another language."
      />
    </PanelSection>
  );
}
