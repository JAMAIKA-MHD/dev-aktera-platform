import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Field, inputClass } from "./Field";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  hint?: ReactNode;
  path?: string;
  disabled?: boolean;
}

// A native select: the most accessible list there is, with the phone's own picker on mobile.
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  path,
  disabled,
}: SelectFieldProps<T>) {
  return (
    <Field label={label} hint={hint} path={path}>
      {(id) => (
        <div className="relative">
          <select
            id={id}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value as T)}
            className={`${inputClass} cursor-pointer appearance-none pr-9`}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-brand-text-muted"
            aria-hidden
          />
        </div>
      )}
    </Field>
  );
}
