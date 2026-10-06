import { Check, CircleAlert } from "lucide-react";
import { useId, type CSSProperties } from "react";
import { tint } from "../../../theme/recipes";
import { useOpenLegalSheet } from "../../frame/legalSheet";

// The consent of Law 18-07 (N3): a real checkbox, never ticked in advance, required to take
// part, with a link to the legal sheet. The box pops when ticked; when it is the only thing
// left, it draws the eye.
export function ConsentField({
  checked,
  text,
  readRulesLabel,
  error,
  attention,
  order,
  onChange,
  onOpenRules,
}: {
  checked: boolean;
  text: string;
  readRulesLabel: string;
  error: string | null;
  attention: boolean; // every other field is valid
  order: number;
  onChange: (checked: boolean) => void;
  onOpenRules: () => void; // reported (consent_opened) before the sheet opens
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const openSheet = useOpenLegalSheet();
  return (
    <div
      className="xp-field flex flex-col gap-1"
      style={{ "--xp-field-order": order } as CSSProperties}
      data-xp-edit="form.consent"
    >
      {/* relative: the hidden native box stays inside its label, which comes into view on focus. */}
      <label className="relative flex cursor-pointer items-start gap-3 py-1">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
          onFocus={(event) =>
            event.currentTarget.parentElement?.scrollIntoView?.({
              block: "nearest",
            })
          }
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <span
          aria-hidden
          className="relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-[var(--xp-radius-sm)] border-2 transition-[background-color,border-color,transform] duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--xp-primary)] peer-active:scale-90"
          style={
            checked
              ? {
                  background:
                    "linear-gradient(135deg, var(--xp-primary-light), var(--xp-primary))",
                  borderColor: "var(--xp-primary)",
                  boxShadow: `0 0.25rem 0.75rem -0.2rem ${tint("--xp-primary", 60)}`,
                }
              : {
                  borderColor: error
                    ? "var(--xp-danger)"
                    : attention
                      ? "var(--xp-primary)"
                      : tint("--xp-text", 40),
                  backgroundColor: tint("--xp-surface", 88),
                }
          }
        >
          {checked && (
            <Check
              className="xp-pop size-4"
              strokeWidth={3}
              style={{ color: "var(--xp-on-primary)" }}
            />
          )}
          {attention && !checked && (
            <span
              className="xp-ping absolute -inset-1 rounded-[var(--xp-radius-sm)] border-2"
              style={{ borderColor: tint("--xp-primary", 60) }}
            />
          )}
        </span>
        <span dir="auto" className="text-sm leading-relaxed">
          {text}
        </span>
      </label>
      <button
        type="button"
        onClick={(event) => {
          onOpenRules();
          openSheet?.(event.currentTarget);
        }}
        className="min-h-[44px] self-start ps-9 text-sm font-semibold underline decoration-2 underline-offset-4"
        style={{ color: "var(--xp-primary)" }}
      >
        {readRulesLabel}
      </button>
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
