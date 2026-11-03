// Step 1: what the campaign is called, which brand runs it, where players find it and
// when it runs.
import { ImageUploader } from "../common/ImageUploader";
import { cn } from "../../lib/utils";
import {
  Field,
  GroupLabel,
  hintClass,
  inputClass,
  StepPanel,
} from "./wizardFields";
import type { FieldErrors, WizardForm } from "./wizardForm";

export interface StepProps {
  form: WizardForm;
  update: (patch: Partial<WizardForm>) => void;
  /** Message to show under a field, once the user has tried to move on. */
  errorFor: (field: string) => string | undefined;
}

export const errorsMatching = (errors: FieldErrors, prefix: string) =>
  Object.keys(errors).some((key) => key.startsWith(prefix));

const PLAYS = [
  ...Array.from({ length: 10 }, (_, i) => String(i + 1)),
  "unlimited",
];

export function StepFoundation({
  form,
  update,
  errorFor,
  isLiveCampaign,
}: StepProps & { isLiveCampaign: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <StepPanel
        title="Campaign foundation"
        description="Name your campaign, say which brand runs it and set when it runs."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Campaign name"
            required
            hint="3 to 80 characters."
            error={errorFor("name")}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                maxLength={80}
                value={form.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="e.g. Ramadan Night Giveaway"
                className={inputClass(Boolean(errorFor("name")))}
              />
            )}
          </Field>
          <Field
            label="Brand name"
            required
            hint="2 to 50 characters. Shown to players on the welcome screen."
            error={errorFor("brandName")}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                maxLength={50}
                value={form.brandName}
                onChange={(event) => update({ brandName: event.target.value })}
                placeholder="e.g. Sample Brand"
                className={inputClass(Boolean(errorFor("brandName")))}
              />
            )}
          </Field>
        </div>

        <Field
          label="Player link"
          required
          hint={
            isLiveCampaign
              ? "Generated automatically and never changed, so printed QR codes keep working."
              : "Generated automatically. It cannot be edited."
          }
        >
          {(props) => (
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 select-none font-mono text-[13px] text-cx-ink-subtle">
                /play/
              </span>
              <input
                {...props}
                type="text"
                readOnly
                disabled
                value={form.slug}
                className={cn(
                  inputClass(),
                  "pl-[3.75rem] font-mono text-[13px]",
                )}
              />
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Starts" required error={errorFor("startDate")}>
            {(props) => (
              <input
                {...props}
                type="datetime-local"
                value={form.startDate}
                onChange={(event) => update({ startDate: event.target.value })}
                className={inputClass(Boolean(errorFor("startDate")))}
              />
            )}
          </Field>
          <Field label="Ends" required error={errorFor("endDate")}>
            {(props) => (
              <input
                {...props}
                type="datetime-local"
                min={form.startDate}
                value={form.endDate}
                onChange={(event) => update({ endDate: event.target.value })}
                className={inputClass(Boolean(errorFor("endDate")))}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Plays per phone number"
            required
            hint="Recommended: 1 play, so prizes reach more customers."
          >
            {(props) => (
              <select
                {...props}
                value={form.maxEntries}
                onChange={(event) => update({ maxEntries: event.target.value })}
                className={inputClass()}
              >
                {PLAYS.map((value) => (
                  <option key={value} value={value}>
                    {value === "unlimited"
                      ? "Unlimited"
                      : `${value} ${value === "1" ? "play" : "plays"}`}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <p className={cn(hintClass, "self-center")}>
            Phone numbers are always checked against the Algerian format (05, 06
            and 07 prefixes).
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <GroupLabel hint="Shown on the welcome screen. Without one, a generic icon is used.">
            Campaign image{" "}
            <span className="font-medium text-cx-ink-subtle">(optional)</span>
          </GroupLabel>
          <ImageUploader
            value={form.heroImageUrl}
            onChange={(heroImageUrl) => update({ heroImageUrl })}
            folder="campaigns"
            label=""
          />
        </div>
      </StepPanel>
    </div>
  );
}
