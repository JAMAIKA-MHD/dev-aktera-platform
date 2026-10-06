import { useState, type ReactNode } from "react";
import {
  hasText,
  LOCALES,
  type Locale,
  type LocalizedText,
} from "../../domain/locale";
import { inputClass, labelClass } from "./Field";

// A text the player reads, in French, Arabic and English (plan §9.2). One tab per language;
// a dot on a tab flags a missing translation (the player then sees the default language);
// the counter warns before a title outgrows two lines on a small phone. The brand types
// Arabic right-to-left without doing anything: dir="auto" and the Arabic font do it.

const LOCALE_NAMES: Record<Locale, string> = {
  fr: "French",
  ar: "Arabic",
  en: "English",
};

export interface LocalizedTextFieldProps {
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  locales?: readonly Locale[]; // the enabled ones; others are hidden
  // The tab shown; controlled by the panel to follow the preview's language.
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  multiline?: boolean;
  maxChars?: number; // counter shown, over it in amber
  placeholder?: LocalizedText; // e.g. the database value a translation replaces
  required?: boolean; // an empty default language is an error, not a warning
  hint?: ReactNode;
  path?: string;
}

export function LocalizedTextField({
  label,
  value,
  onChange,
  locales = LOCALES,
  locale,
  onLocaleChange,
  multiline = false,
  maxChars,
  placeholder,
  required = false,
  hint,
  path,
}: LocalizedTextFieldProps) {
  const [ownLocale, setOwnLocale] = useState<Locale>(locales[0] ?? "fr");
  const active = locale && locales.includes(locale) ? locale : ownLocale;
  const select = (next: Locale) => {
    setOwnLocale(next);
    onLocaleChange?.(next);
  };
  const text = value[active] ?? "";
  // An optional text left empty in every language is not "missing a translation": it is off.
  const started =
    required || locales.some((candidate) => hasText(value, candidate));
  const missing = started
    ? locales.filter((candidate) => !hasText(value, candidate))
    : [];
  const inputId = `${path ?? label}-${active}`.replace(/[^\w-]/g, "-");
  const over = maxChars !== undefined && text.length > maxChars;

  const update = (next: string) => {
    const copy: LocalizedText = { ...value };
    // Emptied means missing: no empty strings left behind in the JSON.
    if (next === "") delete copy[active];
    else copy[active] = next;
    onChange(copy);
  };

  const Control = multiline ? "textarea" : "input";
  return (
    <div className="space-y-1.5" data-studio-path={path}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <label htmlFor={inputId} className={labelClass}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <div
          role="tablist"
          aria-label={`${label} language`}
          className="flex gap-0.5"
        >
          {locales.map((candidate) => {
            const isMissing = missing.includes(candidate);
            return (
              <button
                key={candidate}
                type="button"
                role="tab"
                aria-selected={candidate === active}
                aria-label={`${LOCALE_NAMES[candidate]}${isMissing ? " (missing translation)" : ""}`}
                onClick={() => select(candidate)}
                className={`relative min-h-7 min-w-9 rounded-md px-1.5 text-[10px] font-black uppercase transition active:scale-95 focus-visible:outline-2 focus-visible:outline-blue-500 ${
                  candidate === active
                    ? "bg-blue-600 text-white"
                    : "text-brand-text-muted hover:bg-card-hover hover:text-brand-text"
                }`}
              >
                {candidate}
                {isMissing && (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400 ring-2 ring-card-bg"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <Control
        id={inputId}
        dir="auto"
        lang={active}
        value={text}
        placeholder={placeholder?.[active] ?? placeholder?.fr ?? ""}
        onChange={(event) => update(event.target.value)}
        rows={multiline ? 4 : undefined}
        aria-invalid={
          required && active === locales[0] && !hasText(value, active)
        }
        className={`${inputClass} ${multiline ? "min-h-24 resize-y py-2.5 leading-relaxed" : ""} aria-[invalid=true]:border-red-400`}
      />
      <div className="flex min-h-4 items-start justify-between gap-3 text-xs">
        <p className="text-brand-text-muted">
          {missing.includes(active) && text === "" ? (
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {LOCALE_NAMES[active]} missing — players see the default language.
            </span>
          ) : (
            hint
          )}
        </p>
        {maxChars !== undefined && (
          <span
            className={`shrink-0 font-semibold tabular-nums ${over ? "text-amber-600 dark:text-amber-400" : "text-brand-text-muted"}`}
            aria-live="polite"
          >
            {text.length}/{maxChars}
          </span>
        )}
      </div>
    </div>
  );
}
