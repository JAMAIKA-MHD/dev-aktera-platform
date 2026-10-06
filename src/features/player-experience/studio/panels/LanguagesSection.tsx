import { ChevronDown } from "lucide-react";
import { LOCALES, type Locale } from "../../domain/locale";
import { usePopover } from "../fields/Field";
import { useStudio } from "../StudioContext";
import { PanelIssues } from "./PanelLayout";

// Which languages players are offered, and which one they get first (plan §9.2, Content), in a
// menu at the top of the panel. The default language is always offered: it is the fallback of
// every missing translation.

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
  const { open, setOpen, containerRef } = usePopover<HTMLDivElement>();

  // Kept in the fixed fr, ar, en order, whatever the order of the clicks.
  const enabledWith = (locale: Locale, on: boolean) =>
    LOCALES.filter((candidate) =>
      candidate === locale ? on : locales.enabled.includes(candidate),
    );

  const toggle = (locale: Locale, on: boolean) => {
    updateConfig({ locales: { ...locales, enabled: enabledWith(locale, on) } });
    if (!on && previewLocale === locale) setLocale(locales.default);
  };
  // A language made the default is offered too.
  const makeDefault = (locale: Locale) =>
    updateConfig({
      locales: { default: locale, enabled: enabledWith(locale, true) },
    });

  const summary = `${locales.enabled.map((locale) => locale.toUpperCase()).join(" · ")} — default ${locales.default.toUpperCase()}`;

  return (
    <div className="space-y-2">
      <PanelIssues prefixes={["locales"]} />
      <div ref={containerRef} className="relative">
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-card-border bg-card-bg px-3 text-sm text-brand-text shadow-sm transition hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:border-slate-600"
        >
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-bold">Languages</span>
            <span className="block truncate text-xs text-brand-text-muted">
              {summary}
            </span>
          </span>
          <ChevronDown
            className={`size-4 text-brand-text-muted transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-card-border bg-card-bg p-2 shadow-xl">
            <p className="px-2 pb-1 text-xs text-brand-text-muted">
              Players switch language on every screen; missing texts fall back
              to the default language.
            </p>
            <ul className="divide-y divide-card-border">
              {LOCALES.map((locale) => {
                const isDefault = locale === locales.default;
                const enabled = locales.enabled.includes(locale);
                return (
                  <li
                    key={locale}
                    className="flex min-h-11 items-center gap-2 px-1"
                  >
                    <button
                      type="button"
                      aria-label={`Make ${LOCALE_LABELS[locale]} the default language`}
                      aria-pressed={isDefault}
                      disabled={isDefault}
                      title={
                        isDefault
                          ? "Default language"
                          : `Make ${LOCALE_LABELS[locale]} the default language`
                      }
                      onClick={() => makeDefault(locale)}
                      className={`min-h-9 shrink-0 rounded-lg px-2.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-95 disabled:cursor-default ${
                        isDefault
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                          : "text-brand-text-muted hover:bg-card-hover hover:text-brand-text"
                      }`}
                    >
                      {isDefault ? "Default" : "Make default"}
                    </button>
                    <span className="flex-1 text-sm font-semibold text-brand-text">
                      {LOCALE_LABELS[locale]}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`${LOCALE_LABELS[locale]}${isDefault ? " (default)" : ""}`}
                      disabled={isDefault}
                      title={
                        isDefault
                          ? "The default language is always offered"
                          : undefined
                      }
                      onClick={() => toggle(locale, !enabled)}
                      data-studio-path={`locales.enabled.${locale}`}
                      className="flex min-h-11 items-center px-1 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span
                        className={`flex h-6 w-10 items-center rounded-full p-0.5 transition ${enabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"}`}
                      >
                        <span
                          className={`size-5 rounded-full bg-white shadow transition ${enabled ? "translate-x-4" : ""}`}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
