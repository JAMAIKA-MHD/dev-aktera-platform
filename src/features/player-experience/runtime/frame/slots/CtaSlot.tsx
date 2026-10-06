import type { CSSProperties } from "react";
import { primaryButtonStyle } from "../../../theme/recipes";
import { spacedCaps } from "../text";
import { useIsStuck } from "../useIsStuck";

// Slot 7 (prototype Slot7Cta): one dominant button and at most one quieter one. Labels
// come from the screen content; the actions and the states (disabled, loading) from the
// flow state machine (B4): a button emits an event, it never drives an animation.
// Sticky at the bottom when the content is taller than the screen (frame.css), on a glass
// dock that only shows while it is held there.

export interface CtaSlotProps {
  primaryLabel: string;
  secondaryLabel: string | null;
  onPrimary: () => void;
  onSecondary?: () => void;
  disabled: boolean; // e.g. the registration form is not valid yet
  loading: boolean; // the action is under way: the button waits, it never freezes
  loadingLabel: string;
  editPath: string | null;
}

export function CtaSlot({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  disabled,
  loading,
  loadingLabel,
  editPath,
}: CtaSlotProps) {
  const [ref, stuck] = useIsStuck<HTMLDivElement>();
  const label = loading ? loadingLabel : primaryLabel;
  return (
    <div
      ref={ref}
      data-xp-slot="cta"
      data-xp-stuck={stuck || undefined}
      data-xp-rise
      style={{ "--xp-rise-order": 5 } as CSSProperties}
      className="flex flex-col items-stretch gap-1"
    >
      <button
        type="button"
        data-xp-edit={editPath ? `${editPath}.primaryCta` : undefined}
        // Loading keeps the button bright and focusable: it is busy, not unavailable.
        disabled={disabled && !loading}
        aria-disabled={loading || undefined}
        aria-busy={loading || undefined}
        onClick={() => {
          if (!loading) onPrimary();
        }}
        className={`relative isolate inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 overflow-hidden px-6 py-3 text-balance text-center text-[clamp(0.95rem,0.9rem+0.3vw,1.0625rem)] font-extrabold leading-tight transition-[transform,filter] duration-200 ease-out hover:brightness-105 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--xp-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100 ${spacedCaps(label, "uppercase tracking-[0.08em]")}`}
        style={
          disabled && !loading
            ? { ...primaryButtonStyle, boxShadow: "none" }
            : primaryButtonStyle
        }
      >
        {!disabled && !loading && <span aria-hidden className="xp-shimmer" />}
        {loading && (
          <span
            aria-hidden
            className="xp-spin size-5 shrink-0 rounded-full border-2 border-current border-t-transparent"
          />
        )}
        <span dir="auto" className="min-w-0 wrap-anywhere">
          {label}
        </span>
      </button>
      {secondaryLabel && onSecondary && (
        // Quieter: a ghost button, drawn as a plain link on a narrow phone (compact).
        <button
          type="button"
          data-xp-edit={editPath ? `${editPath}.secondaryCta` : undefined}
          onClick={onSecondary}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[var(--xp-radius-pill)] border border-[color:color-mix(in_srgb,var(--xp-text)_14%,transparent)] px-4 text-sm font-bold text-[var(--xp-text-muted)] transition-[transform,color] duration-200 hover:text-[var(--xp-text)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)] compact:w-auto compact:self-center compact:border-transparent compact:px-2 compact:underline compact:underline-offset-4"
        >
          <span dir="auto" className="min-w-0 wrap-anywhere">
            {secondaryLabel}
          </span>
        </button>
      )}
    </div>
  );
}
