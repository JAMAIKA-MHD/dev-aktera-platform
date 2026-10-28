import type { CSSProperties } from "react";
import { isArabicScript, scriptOf, startsOnScreenSide } from "../text";

// Slot 3 (prototype Slot3Title): two lines at most (the cut is intended: data-xp-clamp), three
// on one column, where a template's wider display font may need one more line rather than
// cutting a title the design checks accept.
// Fluid size on the width, capped by the height for low screens and by the width of its
// column (--xp-title-max, frame.css): a title the design checks accept always fits.
// Arabic keeps normal spacing and a more generous line height (D6). In the split pane, the
// text starts on the screen's reading side, even when a fallback is in another script.
// A template with a wider display font scales the size down (--xp-title-scale), so the same
// title still fits its two lines.
export function TitleSlot({
  text,
  direction,
  editPath,
}: {
  text: string;
  direction: "ltr" | "rtl"; // the screen's
  editPath: string | null;
}) {
  return (
    <h1
      data-xp-slot="title"
      data-xp-edit={editPath ? `${editPath}.title` : undefined}
      data-xp-clamp
      data-xp-rise
      data-xp-script={scriptOf(text)}
      dir="auto"
      style={{ "--xp-rise-order": 1 } as CSSProperties}
      className={`line-clamp-3 split:line-clamp-2 text-balance text-center font-extrabold wrap-anywhere text-[calc(clamp(1.125rem,min(0.9rem+2.6vw,4.5svh,var(--xp-title-max)),2.5rem)*var(--xp-title-scale,1))] split:text-[calc(clamp(1.125rem,min(0.6rem+2.4vw,6.5svh,var(--xp-title-max)),2.75rem)*var(--xp-title-scale,1))] ${
        startsOnScreenSide(text, direction)
          ? "split:text-start"
          : "split:text-end"
      } ${isArabicScript(text) ? "leading-[1.45]" : "leading-[1.1] tracking-tight"}`}
    >
      {text}
    </h1>
  );
}
