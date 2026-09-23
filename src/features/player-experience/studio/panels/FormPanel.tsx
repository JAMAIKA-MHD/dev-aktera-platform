import { Lock } from "lucide-react";
import type { FormField, FormFieldKey } from "../../domain/types";
import { Field, inputClass } from "../fields/Field";
import { LocalizedTextField } from "../fields/LocalizedTextField";
import { ToggleField } from "../fields/ToggleField";
import { useStudio } from "../StudioContext";
import {
  PanelBody,
  PanelHeader,
  PanelIssues,
  PanelSection,
} from "./PanelLayout";
import { useTextLocale } from "./useTextLocale";

// Form (plan §9.2): which fields the player fills in, with their labels, and the consent.
// The phone number is locked on and required: it is the anti-duplicate key (N4). The consent
// is always shown, never pre-ticked, and asked before playing (Law 18-07, N3): here the brand
// only words it, and an empty consent is a blocking error.

const FIELD_NAMES: Record<FormFieldKey, string> = {
  fullName: "Full name",
  phone: "Phone number",
  email: "Email",
  wilaya: "Wilaya",
};

const PHONE_LOCK =
  "Always asked and required: one participation per phone number is what stops duplicates.";

function FieldCard({
  field,
  index,
  onChange,
}: {
  field: FormField;
  index: number;
  onChange: (field: FormField) => void;
}) {
  const textLocale = useTextLocale();
  const locked = field.key === "phone";
  return (
    <div
      className="space-y-3 rounded-2xl border border-card-border bg-card-bg p-3 shadow-sm"
      data-studio-path={`form.fields.${field.key}`}
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-bold text-brand-text">
          {FIELD_NAMES[field.key]}
        </span>
        {locked && (
          <span
            title={PHONE_LOCK}
            className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
          >
            <Lock className="size-3" aria-hidden />
            Locked
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <ToggleField
          label="Shown"
          checked={field.enabled}
          onChange={(enabled) =>
            onChange({ ...field, enabled, required: enabled && field.required })
          }
          disabled={locked}
          disabledReason={PHONE_LOCK}
        />
        <ToggleField
          label="Required"
          checked={field.required}
          onChange={(required) => onChange({ ...field, required })}
          disabled={locked || !field.enabled}
          disabledReason={locked ? PHONE_LOCK : "Show the field first"}
        />
      </div>
      {field.enabled && (
        <>
          <LocalizedTextField
            label="Label"
            path={`form.fields.${index}.label`}
            value={field.label}
            onChange={(label) => onChange({ ...field, label })}
            maxChars={32}
            {...textLocale}
          />
          <LocalizedTextField
            label="Placeholder"
            path={`form.fields.${index}.placeholder`}
            value={field.placeholder}
            onChange={(placeholder) => onChange({ ...field, placeholder })}
            maxChars={40}
            {...textLocale}
          />
        </>
      )}
    </div>
  );
}

export function FormPanel() {
  const form = useStudio((state) => state.config.form);
  const updateForm = useStudio((state) => state.updateForm);
  const textLocale = useTextLocale();

  const setField = (index: number) => (field: FormField) =>
    updateForm({
      fields: form.fields.map((current, at) =>
        at === index ? field : current,
      ),
    });

  return (
    <>
      <PanelHeader
        title="Form"
        description="What players fill in before they play, and what they agree to."
      />
      <PanelBody>
        <PanelSection
          title="Fields"
          description="Keep it short: every extra field loses players."
        >
          <PanelIssues prefixes={["form.fields"]} />
          {form.fields.map((field, index) => (
            <FieldCard
              key={field.key}
              field={field}
              index={index}
              onChange={setField(index)}
            />
          ))}
        </PanelSection>

        <PanelSection
          title="Consent"
          description="Shown unticked under the form; players must tick it to play (Law 18-07)."
        >
          <PanelIssues prefixes={["form.consent"]} />
          <LocalizedTextField
            label="Consent text"
            path="form.consent.text"
            value={form.consent.text}
            onChange={(text) =>
              updateForm({ consent: { ...form.consent, text } })
            }
            multiline
            required
            maxChars={280}
            {...textLocale}
          />
          <Field
            label="Policy version"
            path="form.consent.policyVersion"
            hint="Stored with every consent. Change it whenever the privacy policy changes."
          >
            {(id) => (
              <input
                id={id}
                value={form.consent.policyVersion}
                maxLength={40}
                onChange={(event) =>
                  event.target.value.trim() &&
                  updateForm({
                    consent: {
                      ...form.consent,
                      policyVersion: event.target.value,
                    },
                  })
                }
                className={`${inputClass} font-mono`}
              />
            )}
          </Field>
        </PanelSection>
      </PanelBody>
    </>
  );
}
