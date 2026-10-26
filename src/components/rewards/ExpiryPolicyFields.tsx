import React, { useId } from "react";
import { algiersEndOfDayToIso, expiryWarning } from "../../lib/codeExpiry";
import {
  MAX_EXPIRY_DAYS,
  daysFromAmount,
  type DurationUnit,
  type ExpiryMode,
  type ExpiryPolicyForm,
} from "../../lib/expiryPolicy";

interface ExpiryPolicyFieldsProps {
  value: ExpiryPolicyForm;
  onChange: (next: ExpiryPolicyForm) => void;
  disabled?: boolean;
}

const OPTIONS: { mode: ExpiryMode; label: string; hint: string }[] = [
  { mode: "none", label: "No expiry", hint: "The codes never expire." },
  {
    mode: "date",
    label: "On a fixed date",
    hint: "Every code stops being valid after the same day.",
  },
  {
    mode: "after_delivery",
    label: "After delivery",
    hint: "Each code is valid for a period that starts when it is given to the winner.",
  },
];

const UNITS: { unit: DurationUnit; label: string }[] = [
  { unit: "days", label: "days" },
  { unit: "weeks", label: "weeks" },
  { unit: "months", label: "months (30 days)" },
];

const fieldClass =
  "bg-card-bg-subtle border border-card-border focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-brand-text min-h-11 focus:outline-none disabled:opacity-60";

// How the codes of a digital reward expire: never, on a fixed date, or for a period that starts
// when the code is given to the winner. Used by the reward form (create and edit).
export const ExpiryPolicyFields: React.FC<ExpiryPolicyFieldsProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const id = useId();
  const set = (changes: Partial<ExpiryPolicyForm>) =>
    onChange({ ...value, ...changes });

  const dayWarning =
    value.mode === "date" && value.day
      ? expiryWarning(algiersEndOfDayToIso(value.day))
      : null;
  const amountInvalid =
    value.mode === "after_delivery" &&
    daysFromAmount(value.amount, value.unit) === null;

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-[11px] font-black uppercase tracking-wider text-brand-text">
        Expiry of the codes
      </legend>

      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const selected = value.mode === option.mode;
          return (
            <label
              key={option.mode}
              className={`flex cursor-pointer flex-col gap-0.5 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                selected
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-card-border bg-card-bg-subtle hover:bg-card-bg"
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-black text-brand-text">
                <input
                  type="radio"
                  name={`${id}-mode`}
                  value={option.mode}
                  checked={selected}
                  onChange={() => set({ mode: option.mode })}
                  className="accent-emerald-600"
                />
                {option.label}
              </span>
              <span className="pl-5 text-[11px] leading-snug text-brand-textMuted">
                {option.hint}
              </span>
            </label>
          );
        })}
      </div>

      {value.mode === "date" && (
        <div className="flex flex-col gap-1.5 pt-1">
          <label
            htmlFor={`${id}-day`}
            className="text-[11px] font-bold text-brand-textMuted"
          >
            Expiry date
          </label>
          <input
            id={`${id}-day`}
            type="date"
            value={value.day}
            onChange={(event) => set({ day: event.target.value })}
            aria-describedby={dayWarning ? `${id}-day-note` : undefined}
            className={fieldClass}
          />
          <p
            id={`${id}-day-note`}
            className={`text-[11px] ${dayWarning ? "text-amber-500" : "text-brand-textMuted"}`}
          >
            {dayWarning ??
              "The codes stop being given after this day. You can still set a different date on a single code."}
          </p>
        </div>
      )}

      {value.mode === "after_delivery" && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-brand-textMuted">
            Valid for
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_EXPIRY_DAYS}
              step={1}
              aria-label="Validity period"
              value={value.amount}
              onChange={(event) => set({ amount: event.target.value })}
              aria-invalid={amountInvalid}
              aria-describedby={`${id}-period-note`}
              className={`${fieldClass} w-28 font-mono font-bold ${amountInvalid ? "border-red-500/60" : ""}`}
            />
            <select
              aria-label="Validity unit"
              value={value.unit}
              onChange={(event) =>
                set({ unit: event.target.value as DurationUnit })
              }
              className={fieldClass}
            >
              {UNITS.map((unit) => (
                <option key={unit.unit} value={unit.unit}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
          <p
            id={`${id}-period-note`}
            className={`text-[11px] ${amountInvalid ? "text-red-500" : "text-brand-textMuted"}`}
          >
            {amountInvalid
              ? `Enter a whole number, up to ${MAX_EXPIRY_DAYS} days.`
              : "The countdown starts when the code is given to the winner and ends with that day. A deadline already given does not change if you edit this later."}
          </p>
        </div>
      )}
    </fieldset>
  );
};
