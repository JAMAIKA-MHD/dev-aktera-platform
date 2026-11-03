// Building blocks of the Campaign Radios screens (list, details, editor): type styles,
// button, status badge, progress bar, notice, the "more actions" menu and the confirmation
// dialog. Colours, radii and shadows come from the `cx-*` tokens of src/index.css. The
// game emblems are in ./GameEmblem.
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

import type { Campaign } from "../../types";
import { cn } from "../../lib/utils";
import { isScheduled, STATUS_META, type BadgeTone } from "./campaignMeta";

type Translate = (key: string, fallback?: string) => string;

/** Root of a Campaign Radios screen: its font and its default text. */
export const cxRoot = "font-cx text-sm leading-[22px] text-cx-ink antialiased";

export const cxText = {
  pageTitle: "text-[28px] font-extrabold leading-9 tracking-[-0.02em]",
  sectionTitle: "text-base font-bold leading-6",
  caption: "text-xs font-medium leading-[18px] text-cx-ink-subtle",
  /** Column and stat captions. */
  label:
    "text-xs font-bold uppercase leading-4 tracking-[0.06em] text-cx-ink-subtle",
  statValue: "text-[28px] font-bold leading-8 tracking-[-0.01em] tabular-nums",
  statValueSm: "text-lg font-bold leading-6 tabular-nums",
};

export const cxFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cx-focus";

/** A group of content: the only bordered surface, never nested in another one. */
export const cxPanel =
  "rounded-cx-lg border border-cx-border bg-cx-surface shadow-cx-card";

/** A text input or a select. Its label sits above it, never as a placeholder. */
export const cxField = (invalid = false) =>
  cn(
    "h-10 w-full min-w-0 rounded-cx-md border bg-cx-surface px-3 text-sm font-medium tabular-nums text-cx-ink transition-colors duration-[120ms] placeholder:font-normal placeholder:text-cx-ink-subtle disabled:cursor-not-allowed disabled:opacity-60",
    cxFocus,
    invalid ? "border-cx-danger" : "border-cx-control",
  );

/** The small number beside a tab or a filter. */
export const cxCount =
  "min-w-6 rounded-cx-sm bg-cx-sunken px-1.5 text-center text-xs font-bold leading-5 tabular-nums text-cx-ink-muted";

type ButtonVariant =
  "primary" | "secondary" | "ghost" | "danger" | "dangerSolid";
type ButtonSize = "md" | "sm";

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  // The single filled action of a view.
  primary:
    "border-cx-brand bg-cx-brand text-cx-on-brand not-disabled:hover:border-cx-brand-hover not-disabled:hover:bg-cx-brand-hover",
  secondary:
    "border-cx-control bg-cx-surface text-cx-ink not-disabled:hover:bg-cx-sunken",
  ghost:
    "border-transparent bg-transparent text-cx-ink not-disabled:hover:bg-cx-sunken",
  danger:
    "border-transparent bg-transparent text-cx-danger not-disabled:hover:bg-cx-danger-soft",
  // Confirms a destructive action in a dialog.
  dangerSolid:
    "border-cx-danger bg-cx-danger text-cx-surface not-disabled:hover:opacity-90",
};

export function cxButtonClass({
  variant = "secondary",
  size = "md",
  iconOnly = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-cx-md border font-semibold leading-none transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    cxFocus,
    size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-[13px]",
    iconOnly && (size === "md" ? "w-10 px-0" : "w-8 px-0"),
    BUTTON_VARIANT[variant],
    className,
  );
}

export function CxButton({
  variant,
  size,
  iconOnly,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A square button holding only an icon; give it an `aria-label`. */
  iconOnly?: boolean;
}) {
  return (
    <button
      type={type}
      className={cxButtonClass({ variant, size, iconOnly, className })}
      {...props}
    />
  );
}

const BADGE_TONE: Record<BadgeTone, string> = {
  success: "bg-cx-success-soft text-cx-success",
  warning: "bg-cx-warning-soft text-cx-warning",
  brand: "bg-cx-brand-soft text-cx-brand-text",
  neutral: "bg-cx-sunken text-cx-ink-muted",
  outline: "bg-cx-surface text-cx-ink-muted ring-1 ring-inset ring-cx-control",
};

// A state is always a dot plus a word, never a colour alone.
export function CxBadge({
  tone,
  className,
  children,
}: {
  tone: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-bold leading-none",
        BADGE_TONE[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

export function CampaignStatusBadge({
  campaign,
  t,
  className,
}: {
  campaign: Pick<Campaign, "status" | "startDate">;
  t: Translate;
  className?: string;
}) {
  if (isScheduled(campaign)) {
    return (
      <CxBadge tone="brand" className={className}>
        Scheduled
      </CxBadge>
    );
  }
  const meta = STATUS_META[campaign.status];
  return (
    <CxBadge tone={meta.tone} className={className}>
      {t(meta.key, meta.label)}
    </CxBadge>
  );
}

export function CxBar({
  percent,
  tone = "brand",
  label,
  className,
}: {
  /** 0 to 100. */
  percent: number;
  /** `game` takes the colour of the `cx-g-<game>` class set on an ancestor. */
  tone?: "brand" | "success" | "game";
  /** What the bar says, for screen readers; without it the bar is decorative. */
  label?: string;
  className?: string;
}) {
  return (
    <div
      role={label ? "img" : "presentation"}
      aria-label={label}
      className={cn(
        "h-1.5 overflow-hidden rounded-full bg-cx-sunken ring-1 ring-inset ring-cx-border",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full",
          tone === "success"
            ? "bg-cx-success"
            : tone === "game"
              ? "bg-cx-game"
              : "bg-cx-brand",
        )}
        style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }}
      />
    </div>
  );
}

const NOTICE_TONE = {
  warning: "bg-cx-warning-soft text-cx-warning",
  danger: "bg-cx-danger-soft text-cx-danger",
  success: "bg-cx-success-soft text-cx-success",
};

export function CxNotice({
  tone,
  icon: Icon,
  role,
  className,
  children,
}: {
  tone: keyof typeof NOTICE_TONE;
  icon: LucideIcon;
  role?: "alert";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-cx-md px-4 py-3 text-[13px] font-semibold leading-5",
        NOTICE_TONE[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export interface ActionMenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  /** Destructive actions are set apart at the bottom, in red. */
  destructive?: boolean;
  disabled?: boolean;
  /** Why the action is disabled, or what it does. */
  hint?: string;
}

// A "more actions" button with its menu. Closes on outside click, Escape or selection.
export function ActionMenu({
  label,
  items,
  placement = "top",
  variant = "ghost",
  size = "sm",
}: {
  label: string;
  items: ActionMenuItem[];
  /** Side of the button the menu opens on. */
  placement?: "top" | "bottom";
  variant?: "ghost" | "secondary";
  size?: ButtonSize;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const regular = items.filter((item) => !item.destructive);
  const destructive = items.filter((item) => item.destructive);
  const renderItem = (item: ActionMenuItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.label}
        type="button"
        role="menuitem"
        disabled={item.disabled}
        title={item.hint}
        onClick={() => {
          setOpen(false);
          item.onSelect();
        }}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-cx-sm px-2.5 py-2 text-left text-sm font-medium transition-colors duration-[120ms] disabled:cursor-not-allowed disabled:opacity-50",
          cxFocus,
          item.destructive
            ? "text-cx-danger enabled:hover:bg-cx-danger-soft"
            : "text-cx-ink enabled:hover:bg-cx-sunken",
        )}
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1">{item.label}</span>
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <CxButton
        variant={variant}
        size={size}
        iconOnly
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal aria-hidden />
      </CxButton>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            "absolute right-0 z-30 w-56 rounded-cx-md border border-cx-border bg-cx-surface p-1 shadow-cx-pop",
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {regular.map(renderItem)}
          {destructive.length > 0 && regular.length > 0 && (
            <div className="my-1 border-t border-cx-border" />
          )}
          {destructive.map(renderItem)}
        </div>
      )}
    </div>
  );
}

// Modal confirmation for an action that cannot be undone from the same screen.
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  // Rendered on the body so that it always sits above the page and the campaign editor.
  return createPortal(
    <div
      className={cn(
        cxRoot,
        "fixed inset-0 z-50 flex items-center justify-center bg-cx-scrim p-4",
      )}
      onClick={() => !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-cx-xl border border-cx-border bg-cx-surface p-6 shadow-cx-pop"
      >
        <h3 className={cxText.sectionTitle}>{title}</h3>
        <div className="space-y-2 text-cx-ink-muted">{children}</div>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <CxButton disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </CxButton>
          <CxButton
            variant={destructive ? "dangerSolid" : "primary"}
            disabled={busy}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </CxButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
