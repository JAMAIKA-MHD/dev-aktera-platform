import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";

// The modal of the player screens: a scrim over the page (--xp-scrim) and a dialog on it.
// Escape and a tap on the scrim close it; the focus stays inside and goes back to the opener;
// the page behind does not scroll. A bottom sheet on a phone, centred from the wide tier
// ("sheet"), or centred everywhere ("center"). position: fixed is fine: the runtime always
// lives in a document of its own.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  labelledBy: string; // id of the dialog's title
  onClose: () => void;
  // Where the focus goes back on close: the element that opened it. A tap does not always
  // focus it (Safari), so the focused element would not be enough.
  returnFocusTo: HTMLElement;
  initialFocus?: RefObject<HTMLElement | null>;
  placement?: "sheet" | "center";
  className?: string; // the dialog's
  style?: CSSProperties; // the dialog's
  scrimClassName?: string;
  children: ReactNode;
  [data: `data-${string}`]: string | undefined; // on the scrim
}

export function Modal({
  labelledBy,
  onClose,
  returnFocusTo,
  initialFocus,
  placement = "sheet",
  className = "",
  style,
  scrimClassName = "",
  children,
  ...data
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    (
      initialFocus?.current ??
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    )?.focus();
    return () => {
      root.style.overflow = overflow;
      returnFocusTo.focus();
    };
    // Mounted once per opening: the opener is read when the modal opens.
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = [
      ...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
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

  // Only a tap on the scrim itself closes: not a tap inside the dialog.
  const onScrim = (event: MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      {...data}
      onClick={onScrim}
      onKeyDown={onKeyDown}
      data-xp-placement={placement}
      className={`xp-modal-scrim ${scrimClassName} fixed inset-0 z-50 flex justify-center ${
        placement === "sheet"
          ? "items-end wide:items-center wide:p-6"
          : "items-center p-4"
      }`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={className}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
