import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { labelClass } from "./Field";

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly Segment<T>[];
  onChange: (value: T) => void;
  path?: string;
  hideLabel?: boolean;
}

// A few mutually exclusive choices, all visible at once (Corners: Sharp · Rounded · Pill).
// A radio group: Tab reaches the selected one, arrows move the choice, as in the browser's
// own radio buttons.
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  path,
  hideLabel = false,
}: SegmentedControlProps<T>) {
  const id = useId();
  const group = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() =>
      group.current
        ?.querySelector<HTMLElement>(`[data-value="${next.value}"]`)
        ?.focus(),
    );
  };

  return (
    <div className="space-y-1.5" data-studio-path={path}>
      <span id={id} className={hideLabel ? "sr-only" : labelClass}>
        {label}
      </span>
      <div
        ref={group}
        role="radiogroup"
        aria-labelledby={id}
        onKeyDown={onKeyDown}
        className="flex gap-1 rounded-xl bg-card-bg-subtle p-1 ring-1 ring-card-border"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-value={option.value}
              onClick={() => onChange(option.value)}
              className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-blue-500 ${
                selected
                  ? "bg-card-bg text-brand-text shadow-sm ring-1 ring-card-border"
                  : "text-brand-text-muted hover:text-brand-text"
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
