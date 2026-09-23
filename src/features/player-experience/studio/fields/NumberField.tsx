import { useEffect, useState, type ReactNode } from "react";
import { Field, inputClass } from "./Field";

export interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string; // "%", "px"…
  slider?: boolean; // a range slider beside the number, for 0–100 style values
  hint?: ReactNode;
  path?: string;
}

export function clampToStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const clamped = Math.min(max, Math.max(min, value));
  const snapped = Math.round((clamped - min) / step) * step + min;
  return Number(snapped.toFixed(4));
}

// A bounded number. Typing is free (an empty or half-typed value is allowed while the brand
// types); the value is clamped to its bounds when the field is left, never silently while
// typing, which would fight the keyboard.
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  slider = false,
  hint,
  path,
}: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number(draft.replace(",", "."));
    const next =
      Number.isFinite(parsed) && draft.trim() !== ""
        ? clampToStep(parsed, min, max, step)
        : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <Field label={label} hint={hint} path={path}>
      {(id) => (
        <div className="flex items-center gap-3">
          {slider && (
            <input
              type="range"
              aria-label={`${label} slider`}
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(event) => onChange(Number(event.target.value))}
              className="h-11 flex-1 cursor-pointer accent-blue-600"
            />
          )}
          <div className={`relative ${slider ? "w-24" : "w-full"}`}>
            <input
              id={id}
              type="number"
              inputMode="decimal"
              min={min}
              max={max}
              step={step}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commit();
              }}
              className={`${inputClass} tabular-nums ${unit ? "pr-8" : ""}`}
            />
            {unit && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand-text-muted">
                {unit}
              </span>
            )}
          </div>
        </div>
      )}
    </Field>
  );
}
