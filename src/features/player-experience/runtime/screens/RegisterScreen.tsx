import { useMemo, useState } from "react";
import { formErrors, type FormErrors } from "../../domain/flow";
import {
  getDirection,
  resolveText,
  type LocalizedText,
} from "../../domain/locale";
import { PARTICIPATION_ERROR_MESSAGES } from "../../domain/participation";
import { FORM_TEXT } from "../../presets/contentDefaults";
import { ALGERIA_WILAYAS, wilayaLabel } from "../../presets/wilayas";
import { tint } from "../../theme/recipes";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { ConsentField } from "./form/ConsentField";
import { FormField } from "./form/FormField";
import { press, type ScreenProps } from "./screenProps";

// Registration screen (plan §6.2), before any game (B3, Law 18-07): the fields chosen by the
// brand, the phone always there and required (it is the anti-duplicate key, N4), and the
// consent, never ticked in advance. The CTA stays disabled until everything is valid.
// Errors show once a field is left, then follow the typing (D16), and all at once when the
// form is sent with Enter. On a low screen, the form scrolls inside slot 5 and the CTA
// stays reachable at the bottom.
export function RegisterScreen({ flow, config, locale, chrome }: ScreenProps) {
  const { state } = flow;
  const fallback = config.locales.default;
  const text = (value: LocalizedText) => resolveText(value, locale, fallback);
  const errors: FormErrors = formErrors(state, config.form);
  const [left, setLeft] = useState<ReadonlySet<keyof FormErrors>>(new Set());
  const [sent, setSent] = useState(false);
  const leave = (key: keyof FormErrors) =>
    setLeft((keys) => (keys.has(key) ? keys : new Set(keys).add(key)));
  const shown = (key: keyof FormErrors) => {
    const code = errors[key];
    return code && (sent || left.has(key))
      ? text(FORM_TEXT.errors[code])
      : null;
  };
  const submit = () => {
    if (!flow.canSubmit) setSent(true);
    flow.submit(); // refused, and reported, while the form is not valid
  };
  const wilayas = useMemo(
    () =>
      ALGERIA_WILAYAS.map((wilaya) => ({
        value: wilaya.code, // the code, whatever the language: "16"
        label: wilayaLabel(wilaya, locale),
      })),
    [locale],
  );
  const fields = config.form.fields.filter((field) => field.enabled);
  const onlyConsentLeft =
    errors.consent !== undefined && Object.keys(errors).length === 1;

  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={config.screens.register}
      editPath="screens.register"
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      cta={{
        onPrimary: press(flow, submit, "primary"),
        disabled: !flow.canSubmit,
      }}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex max-h-full min-h-0 flex-col gap-[clamp(0.6rem,3cqh,1.1rem)] self-center overflow-y-auto overscroll-contain rounded-[var(--xp-radius-lg)] border p-[clamp(0.85rem,4cqmin,1.4rem)]"
        style={{
          backgroundColor: tint("--xp-surface", 62),
          borderColor: tint("--xp-text", 12),
          boxShadow: `0 1.25rem 2.5rem -1rem ${tint("--xp-primary", 22)}`,
        }}
      >
        {state.error && (
          // The server refused the details (INVALID_INPUT): the player fixes them here.
          <p
            role="alert"
            dir="auto"
            className="rounded-[var(--xp-radius-md)] border px-3 py-2 text-sm font-semibold"
            style={{
              color: "var(--xp-danger)",
              borderColor: tint("--xp-danger", 45),
              backgroundColor: tint("--xp-danger", 10),
            }}
          >
            {text(PARTICIPATION_ERROR_MESSAGES[state.error.code])}
          </p>
        )}
        {fields.map((field, index) => {
          const optional = !field.required;
          const value = state.participant[field.key];
          return (
            <FormField
              key={field.key}
              fieldKey={field.key}
              label={text(field.label)}
              placeholder={text(field.placeholder)}
              optional={optional ? text(FORM_TEXT.optional) : null}
              value={value}
              options={field.key === "wilaya" ? wilayas : undefined}
              error={shown(field.key)}
              valid={value.trim() !== "" && !errors[field.key]}
              validLabel={text(FORM_TEXT.valid)}
              direction={getDirection(locale)}
              order={index}
              onChange={(next) => flow.updateField(field.key, next)}
              onBlur={() => leave(field.key)}
            />
          );
        })}
        <ConsentField
          checked={state.consentAccepted}
          text={text(config.form.consent.text)}
          readRulesLabel={text(FORM_TEXT.readRules)}
          error={shown("consent")}
          attention={onlyConsentLeft}
          order={fields.length}
          onChange={(accepted) => {
            flow.setConsent(accepted);
            leave("consent");
          }}
          onOpenRules={() => flow.track("consent_opened")}
        />
        {/* Enter sends the form, as on any web form; the CTA stays the visible action. */}
        <button type="submit" tabIndex={-1} aria-hidden className="sr-only" />
      </form>
    </ExperienceFrame>
  );
}
