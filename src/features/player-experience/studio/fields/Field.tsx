import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

// The frame every Studio field shares: a label tied to its control, an optional hint under
// it, a slot on the right of the label (counter, badge), and the configuration path it edits
// (data-studio-path), which the validation panel and preview clicks use to find it.

export const inputClass =
  "min-h-11 w-full rounded-xl border border-card-border bg-card-bg px-3 text-sm text-brand-text shadow-sm transition placeholder:text-brand-text-muted/70 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:border-slate-600";

export const labelClass =
  "text-[10px] font-black uppercase tracking-wider text-brand-text-muted";

export interface FieldProps {
  label: string;
  hint?: ReactNode;
  path?: string;
  trailing?: ReactNode;
  // Receives the id to put on the control, so the label points at it.
  children: (id: string) => ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  path,
  trailing,
  children,
  className = "",
}: FieldProps) {
  const id = useId();
  return (
    <div className={`space-y-1.5 ${className}`} data-studio-path={path}>
      <div className="flex min-h-5 items-center justify-between gap-2">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {trailing}
      </div>
      {children(id)}
      {hint && (
        <p className="text-xs leading-relaxed text-brand-text-muted">{hint}</p>
      )}
    </div>
  );
}

// A small popover: open, closed by Escape or a click outside, focus back on its trigger.
export function usePopover<T extends HTMLElement>(): {
  open: boolean;
  setOpen: (open: boolean) => void;
  containerRef: RefObject<T | null>;
} {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector<HTMLElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, containerRef };
}
