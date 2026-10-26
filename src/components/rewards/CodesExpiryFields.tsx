import React, { useId } from "react";
import { algiersEndOfDayToIso, expiryWarning } from "../../lib/codeExpiry";

/** One date for the codes a reward already holds; an empty day leaves them as they are. */
export interface CodesExpiryForm {
  day: string;
  /** Also replace the dates some codes already have, not only fill the missing ones. */
  replaceExisting: boolean;
}

export const EMPTY_CODES_EXPIRY: CodesExpiryForm = {
  day: "",
  replaceExisting: false,
};

interface CodesExpiryFieldsProps {
  value: CodesExpiryForm;
  onChange: (next: CodesExpiryForm) => void;
  disabled?: boolean;
}

// The reward form, when a digital reward is edited: one date put on all its existing codes at
// once, when the form is saved. The rule above (Expiry of the codes) covers the codes without a
// date of their own; this sets a date on the codes themselves.
export const CodesExpiryFields: React.FC<CodesExpiryFieldsProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const id = useId();
  const warning = value.day
    ? expiryWarning(algiersEndOfDayToIso(value.day))
    : null;

  return (
    <fieldset
      className="flex flex-col gap-2 rounded-2xl border border-card-border bg-card-bg-subtle p-4"
      disabled={disabled}
    >
      <legend className="px-1 text-[11px] font-black uppercase tracking-wider text-brand-text">
        Expiry for all codes
      </legend>
      <p className="text-[11px] text-brand-textMuted">
        Optional. Sets this date on the codes already in the reward when you
        save. Leave it empty to keep their dates.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={`${id}-day`} className="sr-only">
          Expiry date for all codes
        </label>
        <input
          id={`${id}-day`}
          type="date"
          value={value.day}
          onChange={(event) => onChange({ ...value, day: event.target.value })}
          className="bg-card-bg border border-card-border focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-brand-text min-h-11 focus:outline-none disabled:opacity-60"
        />
        <label className="flex items-center gap-2 text-xs text-brand-textMuted">
          <input
            type="checkbox"
            checked={value.replaceExisting}
            onChange={(event) =>
              onChange({ ...value, replaceExisting: event.target.checked })
            }
          />
          Replace dates already set
        </label>
      </div>
      {warning && <p className="text-[11px] text-amber-500">{warning}</p>}
    </fieldset>
  );
};
