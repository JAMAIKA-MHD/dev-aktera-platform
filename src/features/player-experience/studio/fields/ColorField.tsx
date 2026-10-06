import { Check, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { contrastRatio, MIN_TEXT_CONTRAST } from "../../domain/contrast";
import { Field, inputClass, usePopover } from "./Field";

// A brand color: a swatch that opens a picker, and the hex code, typed or pasted. Every
// change shows at once in the preview. When the color carries text (a button, the page), the
// field says whether that text stays readable (WCAG AA, 4.5:1): the brand learns it here, not
// from a player who cannot read the button.

const HEX6 = /^#[0-9a-f]{6}$/i;

export function normalizeHex(input: string): string | null {
  const value = input.trim().replace(/^#?/, "#").toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(value)) {
    return `#${[...value.slice(1)].map((digit) => digit + digit).join("")}`;
  }
  return HEX6.test(value) ? value : null;
}

export interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  // The color of the text drawn on (or under) this one, to rate the contrast.
  contrastWith?: string;
  contrastLabel?: string; // what the pair is, e.g. "Button text"
  path?: string;
}

function ContrastBadge({ ratio, label }: { ratio: number; label?: string }) {
  const ok = ratio >= MIN_TEXT_CONTRAST;
  const Icon = ok ? Check : TriangleAlert;
  return (
    <span
      title={`${label ? `${label}: ` : ""}contrast ${ratio.toFixed(2)}:1 (${ok ? "meets" : "below"} WCAG AA ${MIN_TEXT_CONTRAST}:1)`}
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${
        ok
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
      }`}
    >
      <Icon className="size-3" aria-hidden />
      {ok ? "AA" : "Low contrast"} · {ratio.toFixed(1)}
    </span>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  contrastWith,
  contrastLabel,
  path,
}: ColorFieldProps) {
  const { open, setOpen, containerRef } = usePopover<HTMLDivElement>();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const ratio = contrastWith ? contrastRatio(value, contrastWith) : Number.NaN;

  const commitDraft = (text: string) => {
    setDraft(text);
    const hex = normalizeHex(text);
    if (hex && hex !== value) onChange(hex);
  };

  return (
    <Field
      label={label}
      path={path}
      trailing={
        Number.isFinite(ratio) ? (
          <ContrastBadge ratio={ratio} label={contrastLabel} />
        ) : undefined
      }
    >
      {(id) => (
        <div ref={containerRef} className="relative flex items-center gap-2">
          <button
            type="button"
            aria-label={`Pick ${label.toLowerCase()}`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="size-11 shrink-0 rounded-xl shadow-sm ring-1 ring-black/10 transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:ring-white/15"
            style={{ backgroundColor: value }}
          />
          <input
            id={id}
            value={draft}
            spellCheck={false}
            maxLength={7}
            onChange={(event) => commitDraft(event.target.value)}
            onBlur={() => setDraft(value)}
            aria-invalid={normalizeHex(draft) === null}
            className={`${inputClass} font-mono uppercase aria-[invalid=true]:border-red-400`}
          />
          {open && (
            <div className="absolute left-0 top-full z-20 mt-2 rounded-2xl border border-card-border bg-card-bg p-3 shadow-xl [&_.react-colorful]:!w-52">
              <HexColorPicker color={value} onChange={onChange} />
            </div>
          )}
        </div>
      )}
    </Field>
  );
}
