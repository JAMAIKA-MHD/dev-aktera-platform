import { useId } from "react";

// An on/off switch with its label and an optional line of explanation. The whole row is the
// target (44 px high at least), not only the small track.
export interface ToggleFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  disabledReason?: string; // shown as a tooltip, e.g. why the phone field is locked
  path?: string;
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  disabledReason,
  path,
}: ToggleFieldProps) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={description ? `${id}-description` : undefined}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      onClick={() => onChange(!checked)}
      data-studio-path={path}
      className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-1 text-left transition focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed"
    >
      <span className="min-w-0 flex-1">
        <span
          id={`${id}-label`}
          className={`block text-sm font-semibold ${disabled ? "text-brand-text-muted" : "text-brand-text"}`}
        >
          {label}
        </span>
        {description && (
          <span
            id={`${id}-description`}
            className="block text-xs text-brand-text-muted"
          >
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
        } ${disabled ? "opacity-50" : "group-active:scale-95"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
