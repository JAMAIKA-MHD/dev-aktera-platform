import type { CSSProperties } from "react";
import { isArabicScript, startsOnScreenSide } from "../text";

// Slot 4 (prototype Slot4SupportingCopy): the supporting sentence, in the muted text color,
// at a reading width. Two lines at most when the screen is low (tight density).
export function SupportingCopySlot({
  text,
  direction,
  editPath,
}: {
  text: string;
  direction: "ltr" | "rtl"; // the screen's
  editPath: string | null;
}) {
  return (
    <p
      data-xp-slot="copy"
      data-xp-edit={editPath ? `${editPath}.subtitle` : undefined}
      data-xp-clamp
      data-xp-rise
      dir="auto"
      style={{ "--xp-rise-order": 2 } as CSSProperties}
      className={`mx-auto max-w-[38ch] text-center font-medium text-[var(--xp-text-muted)] wrap-anywhere text-[clamp(0.875rem,min(0.8rem+0.45vw,2.4svh),1.0625rem)] tight:line-clamp-2 split:mx-0 split:text-[clamp(0.875rem,min(0.7rem+0.6vw,3svh),1.25rem)] ${
        startsOnScreenSide(text, direction)
          ? "split:text-start"
          : "split:text-end"
      } ${isArabicScript(text) ? "leading-relaxed" : "leading-snug"}`}
    >
      {text}
    </p>
  );
}
