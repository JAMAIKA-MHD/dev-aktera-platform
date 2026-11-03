import type { CSSProperties } from "react";
import { GameButton } from "../../shell/GameButton";
import { spacedCaps } from "../text";
import { useIsStuck } from "../useIsStuck";

// Slot 7 (prototype Slot7Cta): one dominant button and at most one quieter one, both the
// shell's GameButton in the theme's button styles. Labels come from the screen content; the
// actions and the states (disabled, loading) from the flow state machine (B4): a button
// emits an event, it never drives an animation. Sticky at the bottom when the content is
// taller than the screen (frame.css), on a glass dock that only shows while it is held there.

export interface CtaSlotProps {
  primaryLabel: string;
  secondaryLabel: string | null;
  onPrimary: () => void;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
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
  secondaryDisabled = false,
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
      <GameButton
        data-xp-cta="primary"
        data-xp-edit={editPath ? `${editPath}.primaryCta` : undefined}
        label={primaryLabel}
        loading={loading}
        loadingLabel={loadingLabel}
        disabled={disabled}
        shimmer
        onClick={onPrimary}
        className={`min-h-[52px] w-full gap-2.5 px-6 py-3 text-balance text-center text-[clamp(0.95rem,0.9rem+0.3vw,1.0625rem)] font-extrabold leading-tight active:scale-[0.97] disabled:active:scale-100 ${spacedCaps(label, "uppercase tracking-[0.08em]")}`}
        // An unavailable button lies flat: no shadow lifting it off the page.
        style={disabled && !loading ? { boxShadow: "none" } : undefined}
      />
      {secondaryLabel && onSecondary && (
        // Quieter: the secondary button, drawn as a plain link on a narrow phone (compact).
        <GameButton
          variant="secondary"
          data-xp-cta="secondary"
          data-xp-edit={editPath ? `${editPath}.secondaryCta` : undefined}
          label={secondaryLabel}
          disabled={secondaryDisabled}
          onClick={onSecondary}
          className="min-h-[44px] w-full px-4 text-sm font-bold active:scale-[0.98] compact:w-auto compact:self-center compact:border-transparent compact:bg-transparent compact:px-2 compact:underline compact:underline-offset-4 compact:shadow-none"
        />
      )}
    </div>
  );
}
