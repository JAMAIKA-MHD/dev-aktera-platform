// shadcn/ui Dialog, written without Radix (not installed, like the Button and the Badge): a modal
// window over the page with a title and a close button. It traps the Tab key inside, closes on
// Escape or on a click on the dim background, locks the scroll of the page behind it, and gives
// the focus back to what had it when it opened.
import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Close button label, for the screen readers. */
  closeLabel?: string;
  /** Width of the window; a Tailwind max-width class. */
  className?: string;
  children: React.ReactNode;
}

function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel = "Close",
  className,
  children,
}: DialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const panel = React.useRef<HTMLDivElement>(null);
  // Read by the effect below without making it run again when the caller passes a new function.
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // The first field of the window, else its first control (the close button).
    const focusables = () =>
      Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first =
      panel.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      focusables()[0];
    first?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onOpenChangeRef.current(false);
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(
      panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    if (items.length === 0) return;
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    if (event.shiftKey && document.activeElement === firstItem) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      firstItem.focus();
    }
  };

  return createPortal(
    <div
      data-slot="dialog-overlay"
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-slot="dialog-content"
        className={cn(
          "relative my-auto w-full max-w-lg rounded-2xl border border-border bg-background p-6 text-foreground shadow-2xl",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label={closeLabel}
          className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="mb-5 space-y-1 pr-8">
          <h2 id={titleId} className="text-lg font-bold leading-tight">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export { Dialog };
