import {
  CircleAlert,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Phone,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
} from "react";
import { formatPhoneInput } from "../../../domain/phone";
import type { FormFieldKey } from "../../../domain/types";
import { tint } from "../../../theme/recipes";

// One field of the registration form (plan §6.2, rules.md §6.3): a label, an icon, a colored
// focus ring, a green check once the value is valid, and under it an error that says how
// to fix it, tied to the control for screen readers. Each field has the keyboard of its
// value; the phone is grouped as it is typed, the caret kept in place.

const ICONS: Readonly<Record<FormFieldKey, LucideIcon>> = {
  fullName: User,
  phone: Phone,
  email: Mail,
  wilaya: MapPin,
};

// Keyboard, autofill and direction of each field. Numbers and addresses read left to right,
// also in Arabic.
const INPUTS: Readonly<
  Record<
    Exclude<FormFieldKey, "wilaya">,
    {
      type: string;
      inputMode?: "tel" | "email";
      autoComplete: string;
      ltr: boolean;
    }
  >
> = {
  fullName: { type: "text", autoComplete: "name", ltr: false },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel", ltr: true },
  email: {
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    ltr: true,
  },
};

// Where the caret goes in the formatted phone: after as many digits (and "+") as it
// followed in what was typed.
export function caretAfter(formatted: string, kept: number): number {
  let position = 0;
  let seen = 0;
  while (position < formatted.length && seen < kept) {
    if (/[\d+]/.test(formatted[position])) seen++;
    position++;
  }
  return position;
}

export interface FormFieldProps {
  fieldKey: FormFieldKey;
  label: string;
  placeholder: string;
  optional: string | null; // "facultatif" on an optional field
  value: string;
  options?: ReadonlyArray<{ value: string; label: string }>; // the wilayas
  error: string | null; // shown once the field was left, or the form sent
  valid: boolean; // filled and correct: the reassuring check
  validLabel: string;
  direction: "ltr" | "rtl";
  order: number; // staggered entrance
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function FormField({
  fieldKey,
  label,
  placeholder,
  optional,
  value,
  options,
  error,
  valid,
  validLabel,
  direction,
  order,
  onChange,
  onBlur,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const Icon = ICONS[fieldKey];
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caret.current === null) return;
    input.current?.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  const change = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const raw = event.currentTarget.value;
    if (
      fieldKey !== "phone" ||
      !(event.currentTarget instanceof HTMLInputElement)
    ) {
      onChange(raw);
      return;
    }
    const at = event.currentTarget.selectionStart ?? raw.length;
    const formatted = formatPhoneInput(raw);
    caret.current = caretAfter(
      formatted,
      raw.slice(0, at).replace(/[^\d+]/g, "").length,
    );
    onChange(formatted);
  };
  // A field that gets the focus comes into view: above a virtual keyboard, or on a low
  // screen where the form scrolls inside slot 5 (tasks.md T4.2).
  const focus = (event: FocusEvent<HTMLElement>) =>
    event.currentTarget.scrollIntoView?.({ block: "nearest" });

  const control = {
    id,
    value,
    onChange: change,
    onBlur,
    onFocus: focus,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    required: optional === null,
    className:
      "min-h-[48px] w-full appearance-none rounded-[var(--xp-radius-md)] border border-[color:var(--xp-field-border)] px-11 py-2.5 text-base outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[var(--xp-text-muted)] focus:border-[color:var(--xp-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--xp-primary)_28%,transparent)]",
    style: {
      "--xp-field-border": error ? "var(--xp-danger)" : tint("--xp-text", 20),
      backgroundColor: tint("--xp-surface", 88),
      color: "var(--xp-text)",
    } as CSSProperties,
  };
  const setup = fieldKey === "wilaya" ? null : INPUTS[fieldKey];

  return (
    <div
      className="xp-field flex flex-col gap-1.5"
      style={{ "--xp-field-order": order } as CSSProperties}
      data-xp-edit={`form.fields.${fieldKey}`}
    >
      <label htmlFor={id} dir="auto" className="text-sm font-semibold">
        {label}
        {optional && (
          <span className="font-normal text-[var(--xp-text-muted)]">
            {` (${optional})`}
          </span>
        )}
      </label>
      <div className="group relative">
        <Icon
          aria-hidden
          className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-[var(--xp-text-muted)] transition-colors group-focus-within:text-[var(--xp-primary)]"
          strokeWidth={2}
        />
        {setup ? (
          <input
            {...control}
            ref={input}
            type={setup.type}
            inputMode={setup.inputMode}
            autoComplete={setup.autoComplete}
            enterKeyHint="next"
            placeholder={placeholder}
            dir={setup.ltr ? "ltr" : "auto"}
            // In Arabic, a left-to-right value still starts on the right, like the label.
            style={{
              ...control.style,
              textAlign: direction === "rtl" ? "right" : "left",
            }}
          />
        ) : (
          <select {...control} dir="auto" autoComplete="address-level1">
            <option value="">{placeholder}</option>
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        {valid && (
          <Check
            role="img"
            aria-label={validLabel}
            className={`xp-pop pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 ${setup ? "end-3.5" : "end-10"}`}
            strokeWidth={3}
            style={{ color: "var(--xp-success)" }}
          />
        )}
        {!setup && (
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute end-3.5 top-1/2 size-5 -translate-y-1/2 text-[var(--xp-text-muted)]"
          />
        )}
      </div>
      <p
        id={errorId}
        aria-live="polite"
        dir="auto"
        className="flex items-start gap-1.5 text-sm font-medium empty:hidden"
        style={{ color: "var(--xp-danger)" }}
      >
        {error && (
          <>
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {error}
          </>
        )}
      </p>
    </div>
  );
}
