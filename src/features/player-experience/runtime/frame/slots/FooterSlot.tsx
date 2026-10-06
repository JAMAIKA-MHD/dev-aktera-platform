import type { CSSProperties } from "react";
import { legalLinkTarget } from "../../../domain/legal";
import { resolveText, type Locale } from "../../../domain/locale";
import type { LegalConfig } from "../../../domain/types";
import { FRAME_TEXT } from "../../../presets/contentDefaults";
import { useElementSize } from "../../layout/useElementSize";
import { spacedCaps } from "../text";

// Slot 8 (prototype Slot8FooterUtility): the legal links, each to its own target, the
// organizer and the legal line. Never hidden, in any layout (plan §8.3). The legal line
// scrolls when it is longer than the screen (the banner of the reference design), and
// stands still, wrapped, with reduced motion (frame.css).

// Touch targets of 44 px (RWD5); spacing, not separators, between the links: a "·" would
// start the line when they wrap on a narrow phone.
const LINK =
  "inline-flex min-h-[44px] items-center px-1.5 text-[0.66rem] font-bold text-[var(--xp-text-muted)] underline-offset-4 transition-colors hover:text-[var(--xp-text)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]";
const BAND_SPEED = 40; // px per second: readable while it moves

function LegalBand({
  text,
  direction,
  onOpen,
}: {
  text: string;
  direction: "ltr" | "rtl";
  onOpen: (trigger: HTMLElement) => void;
}) {
  const [boxRef, box] = useElementSize<HTMLButtonElement>();
  const [textRef, textSize] = useElementSize<HTMLSpanElement>();
  const scrolling = box.width > 0 && textSize.width > box.width + 1;
  return (
    <button
      ref={boxRef}
      type="button"
      onClick={(event) => onOpen(event.currentTarget)}
      data-xp-band
      data-xp-clamp
      data-xp-scrolling={scrolling || undefined}
      className="xp-band w-full text-[0.68rem] font-medium text-[var(--xp-text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
      style={
        {
          "--xp-band-to": direction === "rtl" ? "50%" : "-50%",
          "--xp-band-duration": `${Math.max(8, textSize.width / BAND_SPEED)}s`,
        } as CSSProperties
      }
    >
      <span className="xp-band-track">
        <span ref={textRef} dir="auto" className="xp-band-text">
          {text}
        </span>
        {/* The second copy closes the loop; screen readers hear the text once. */}
        {scrolling && (
          <span aria-hidden dir="auto" className="xp-band-text">
            {text}
          </span>
        )}
      </span>
    </button>
  );
}

export function FooterSlot({
  legal,
  locale,
  fallbackLocale,
  direction,
  onOpenSheet,
}: {
  legal: LegalConfig;
  locale: Locale;
  fallbackLocale: Locale;
  direction: "ltr" | "rtl";
  onOpenSheet: (trigger: HTMLElement) => void; // the focus goes back to the trigger
}) {
  const text = (value: LegalConfig["legalLine"]) =>
    resolveText(value, locale, fallbackLocale);
  const legalLine = text(legal.legalLine);
  const organizer = legal.organizerName.trim();
  const links = legal.links.flatMap((link) => {
    const target = legalLinkTarget(link);
    const label = text(link.label);
    return target && label ? [{ id: link.id, label, target }] : [];
  });

  return (
    <footer
      data-xp-slot="footer"
      data-xp-edit="legal"
      data-xp-rise
      style={{ "--xp-rise-order": 6 } as CSSProperties}
      className="flex flex-col items-center gap-1 border-t border-[color:color-mix(in_srgb,var(--xp-text)_8%,transparent)] pt-2"
    >
      {legalLine && (
        <LegalBand
          text={legalLine}
          direction={direction}
          onOpen={onOpenSheet}
        />
      )}
      <div className="flex w-full flex-col items-center gap-x-4 split:flex-row split:justify-between">
        {links.length > 0 && (
          <ul className="flex flex-wrap items-center justify-center gap-x-1">
            {links.map(({ id, label, target }) => {
              const className = `${LINK} ${spacedCaps(label, "uppercase tracking-[0.1em]")}`;
              return (
                <li key={id} className="flex items-center">
                  {target.kind === "sheet" ? (
                    <button
                      type="button"
                      onClick={(event) => onOpenSheet(event.currentTarget)}
                      className={className}
                    >
                      <span dir="auto">{label}</span>
                    </button>
                  ) : (
                    <a
                      href={target.href}
                      {...(target.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className={className}
                    >
                      <span dir="auto">{label}</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {organizer && (
          <p
            dir="auto"
            className="text-center text-[0.68rem] text-[var(--xp-text-muted)] wrap-anywhere"
          >
            {text(FRAME_TEXT.organizedBy).replace("{name}", organizer)}
          </p>
        )}
      </div>
    </footer>
  );
}
