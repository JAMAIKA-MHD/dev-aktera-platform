import { ChevronDown } from "lucide-react";
import {
  ICON_COMPONENTS,
  ICON_NAMES,
  type IconName,
} from "../../presets/icons";
import { Field, usePopover } from "./Field";

// One icon of the shared library (lucide, same stroke everywhere, rules.md D7). A button shows
// the current icon; it opens the grid, where each icon is a radio with its name.

export function iconLabel(name: IconName): string {
  return name.replace(/-/g, " ");
}

export interface IconPickerProps {
  label: string;
  value: IconName | null;
  onChange: (value: IconName | null) => void;
  allowNone?: boolean; // "None": e.g. a wheel segment without an icon
  path?: string;
}

export function IconPicker({
  label,
  value,
  onChange,
  allowNone = false,
  path,
}: IconPickerProps) {
  const { open, setOpen, containerRef } = usePopover<HTMLDivElement>();
  const Current = value ? ICON_COMPONENTS[value] : null;

  const pick = (next: IconName | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Field label={label} path={path}>
      {(id) => (
        <div ref={containerRef} className="relative">
          <button
            id={id}
            type="button"
            aria-haspopup="true"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-card-border bg-card-bg px-3 text-sm text-brand-text shadow-sm transition hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:border-slate-600"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
              {Current ? <Current className="size-4" aria-hidden /> : "–"}
            </span>
            <span className="flex-1 text-left capitalize">
              {value ? iconLabel(value) : "None"}
            </span>
            <ChevronDown
              className={`size-4 text-brand-text-muted transition ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {open && (
            <div
              role="radiogroup"
              aria-label={label}
              className="absolute left-0 right-0 top-full z-20 mt-2 grid grid-cols-6 gap-1 rounded-2xl border border-card-border bg-card-bg p-2 shadow-xl"
            >
              {allowNone && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={value === null}
                  aria-label="None"
                  onClick={() => pick(null)}
                  className={`flex aspect-square min-h-11 items-center justify-center rounded-xl text-xs font-bold transition active:scale-90 ${
                    value === null
                      ? "bg-blue-600 text-white"
                      : "text-brand-text-muted hover:bg-card-hover"
                  }`}
                >
                  –
                </button>
              )}
              {ICON_NAMES.map((name) => {
                const Icon = ICON_COMPONENTS[name];
                const selected = name === value;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={iconLabel(name)}
                    title={iconLabel(name)}
                    onClick={() => pick(name)}
                    className={`flex aspect-square min-h-11 items-center justify-center rounded-xl transition active:scale-90 focus-visible:outline-2 focus-visible:outline-blue-500 ${
                      selected
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                        : "text-brand-text hover:bg-card-hover"
                    }`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Field>
  );
}
