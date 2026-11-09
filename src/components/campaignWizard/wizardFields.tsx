// Layout and input pieces shared by the wizard steps.
import { useId, type ReactElement, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "../../lib/utils";
import { cxField, cxFocus, cxText } from "../campaigns/campaignUi";

export const inputClass = cxField;

/** Label above a field. */
export const fieldLabelClass = "text-xs font-bold leading-4 text-cx-ink-muted";
export const hintClass = cxText.caption;
/** A group of settings inside a step: the bordered row of the editor. */
export const rowClass =
  "rounded-cx-md border border-cx-border bg-cx-surface p-4";

// A part of a step: title, one line of guidance, then its fields. Parts of the same step
// are separated by a hairline, not boxed: the editor window is the panel.
export function StepPanel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 border-t border-cx-border pt-6 first:border-t-0 first:pt-0">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className={cxText.sectionTitle}>{title}</h3>
          <p className="text-[13px] text-cx-ink-muted">{description}</p>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

// A labelled input with its hint and its error. `children` receives the ids to wire up.
export function Field({
  label,
  required = false,
  hint,
  error,
  action,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  action?: ReactNode;
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => ReactElement;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className={fieldLabelClass}>
          {label}
          {required ? (
            <span className="text-cx-danger" aria-hidden>
              {" "}
              *
            </span>
          ) : (
            <span className="font-medium text-cx-ink-subtle"> (optional)</span>
          )}
        </label>
        {action}
      </div>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? messageId : undefined,
      })}
      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : hint ? (
        <p id={messageId} className={hintClass}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1.5 text-xs font-semibold leading-[18px] text-cx-danger"
    >
      <AlertCircle className="size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

// A group heading inside a step, for settings that are not a single input.
export function GroupLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div>
      <p className={fieldLabelClass}>{children}</p>
      {hint && <p className={cn(hintClass, "mt-0.5")}>{hint}</p>}
    </div>
  );
}

// A large selectable card (game type): the whole card is one radio.
export function ChoiceCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  footnote,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  footnote?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        cxFocus,
        "relative flex h-full cursor-pointer flex-col gap-2 rounded-cx-lg border bg-cx-surface p-4 text-left transition-colors duration-[120ms]",
        selected
          ? "border-cx-brand ring-1 ring-cx-brand"
          : "border-cx-border hover:border-cx-control",
      )}
    >
      <span
        className={cn(
          "absolute right-3.5 top-3.5 size-[18px] rounded-full bg-cx-surface",
          selected
            ? "border-[5px] border-cx-brand"
            : "border-2 border-cx-control",
        )}
        aria-hidden
      />
      {icon}
      <span className="mt-2 block text-[15px] font-bold leading-[22px] text-cx-ink">
        {title}
      </span>
      <span className="block text-[13px] leading-[19px] text-cx-ink-muted">
        {description}
      </span>
      {footnote && (
        <span
          className={cn(hintClass, "mt-auto border-t border-cx-border pt-2")}
        >
          You set up: {footnote}
        </span>
      )}
    </button>
  );
}

// A compact row of mutually exclusive options.
export function SegmentedChoice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-cols-1 gap-1 rounded-cx-md border border-cx-border bg-cx-sunken p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            cxFocus,
            "h-8 cursor-pointer rounded-cx-sm px-2 text-[13px] font-semibold transition-colors duration-[120ms]",
            value === option.value
              ? "bg-cx-surface text-cx-ink shadow-cx-card ring-1 ring-cx-border"
              : "text-cx-ink-muted hover:text-cx-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// An on/off setting.
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        cxFocus,
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-[120ms]",
        checked ? "bg-cx-brand" : "bg-cx-control",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-5 rounded-full bg-cx-surface transition-transform duration-[120ms]",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

// A row with a title, one line of guidance and a switch; what it turns on goes below.
export function SwitchRow({
  checked,
  onChange,
  title,
  description,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        rowClass,
        "grid grid-cols-1 gap-3 transition-colors duration-[120ms]",
        checked && "border-cx-brand",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-cx-ink">{title}</p>
          <p className={cn(hintClass, "mt-0.5 max-w-xl")}>{description}</p>
        </div>
        <Switch checked={checked} onChange={onChange} label={title} />
      </div>
      {children}
    </div>
  );
}

// A number picked on a scale, with its value shown beside its label.
export function RangeField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-1 gap-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id}>
          <span className="block font-semibold text-cx-ink">{label}</span>
          {hint && (
            <span className={cn(hintClass, "mt-0.5 block")}>{hint}</span>
          )}
        </label>
        <span className={cn(cxText.statValueSm, "shrink-0 whitespace-nowrap")}>
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          cxFocus,
          "h-1.5 w-full cursor-pointer rounded-full accent-cx-brand",
        )}
      />
      <div className={cn(hintClass, "flex justify-between gap-2 tabular-nums")}>
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

// A compact selectable card: a choice of the mechanics library, a method or a mode.
export function OptionCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  disabled = false,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        cxFocus,
        "relative flex h-full cursor-pointer items-start gap-3 rounded-cx-md border bg-cx-surface p-3.5 pr-10 text-left transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-cx-brand ring-1 ring-cx-brand"
          : "border-cx-border not-disabled:hover:border-cx-control",
      )}
    >
      <span
        className={cn(
          "absolute right-3 top-3.5 size-4 rounded-full bg-cx-surface",
          selected
            ? "border-[4px] border-cx-brand"
            : "border-2 border-cx-control",
        )}
        aria-hidden
      />
      {icon}
      <span className="min-w-0">
        <span className="block font-semibold leading-5 text-cx-ink">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-[13px] leading-[19px] text-cx-ink-muted">
            {description}
          </span>
        )}
        {badge && (
          <span className="mt-1.5 inline-block rounded-cx-sm bg-cx-sunken px-1.5 text-xs font-bold leading-5 text-cx-ink-muted">
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}
