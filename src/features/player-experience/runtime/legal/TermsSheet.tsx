import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { primaryButtonStyle, tint } from "../../theme/recipes";

// The legal sheet (prototype terms modal of App.tsx): the rules and the data notice of the
// campaign, a tap away from every screen (B9). A bottom sheet on a phone, a centred dialog
// from the wide tier. Modal: Escape and a tap outside close it, the focus stays inside and
// goes back to the opener. position: fixed is fine: it stays in the runtime's own document.

export interface TermsSheetProps {
  title: string;
  organizer: string | null; // "Organisé par …", when the brand gave its name
  body: string; // termsBody: one paragraph per line, "•" lines drawn as a list
  closeLabel: string;
  // Where the focus goes back on close: the element that opened the sheet. A tap does not
  // always focus it (Safari), so the focused element would not be enough.
  returnFocusTo: HTMLElement;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Lines starting with "•" are grouped into lists, in their original order.
function Body({ body }: { body: string }) {
  const blocks: { kind: "p" | "ul"; lines: string[] }[] = [];
  for (const line of body.split("\n").map((value) => value.trim())) {
    if (!line) continue;
    const kind = line.startsWith("•") ? "ul" : "p";
    const last = blocks[blocks.length - 1];
    if (kind === "ul" && last?.kind === "ul") last.lines.push(line);
    else blocks.push({ kind, lines: [line] });
  }
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-[var(--xp-text-muted)]">
      {blocks.map((block, index) =>
        block.kind === "p" ? (
          <p key={index} dir="auto" className="wrap-anywhere">
            {block.lines[0]}
          </p>
        ) : (
          <ul key={index} className="flex flex-col gap-2">
            {block.lines.map((line, item) => (
              <li key={item} dir="auto" className="flex gap-2 wrap-anywhere">
                <span
                  aria-hidden
                  className="mt-[0.55em] size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--xp-primary)" }}
                />
                <span>{line.replace(/^•\s*/, "")}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

export function TermsSheet({
  title,
  organizer,
  body,
  closeLabel,
  returnFocusTo,
  onClose,
}: TermsSheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden"; // the page behind does not scroll under the sheet
    closeRef.current?.focus();
    return () => {
      root.style.overflow = overflow;
      returnFocusTo.focus();
    };
    // Mounted once per opening: the opener is read when the sheet opens.
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !sheetRef.current) return;
    const focusable = [
      ...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Only a tap on the backdrop itself closes: not a tap inside the sheet.
  const onBackdrop = (event: MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      data-xp-sheet
      onClick={onBackdrop}
      onKeyDown={onKeyDown}
      className="xp-sheet-backdrop fixed inset-0 z-50 flex items-end justify-center wide:items-center wide:p-6"
      style={{
        backgroundColor: tint("--xp-surface", 70),
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="xp-sheet flex max-h-[85dvh] w-full max-w-[36rem] flex-col rounded-t-[var(--xp-radius-lg)] border wide:rounded-[var(--xp-radius-lg)]"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--xp-text) 6%, var(--xp-surface))",
          borderColor: tint("--xp-text", 12),
          boxShadow: `0 -0.5rem 2.5rem -0.75rem ${tint("--xp-primary", 35)}`,
        }}
      >
        <div className="flex items-start gap-3 ps-5 pe-2 pt-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-3">
            <h2
              id={titleId}
              dir="auto"
              className="text-lg font-extrabold leading-tight wrap-anywhere"
            >
              {title}
            </h2>
            {organizer && (
              <p dir="auto" className="text-xs text-[var(--xp-text-muted)]">
                {organizer}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-[var(--xp-text-muted)] transition-colors hover:text-[var(--xp-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
          >
            <X aria-hidden className="size-5" strokeWidth={2.25} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <Body body={body} />
        </div>
        <div className="px-5 pt-2 pb-[calc(var(--xp-safe-bottom)+1rem)]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] w-full px-5 text-sm font-extrabold transition-transform duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--xp-primary)]"
            style={primaryButtonStyle}
          >
            <span dir="auto">{closeLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
