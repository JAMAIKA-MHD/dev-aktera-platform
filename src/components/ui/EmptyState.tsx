// What a section shows when it has nothing to list. Three separate situations, never mixed up:
//   - first use (no data yet): <EmptyState> with one clear next step;
//   - filters that match nothing: <EmptyState variant="inline"> with a "Clear filters" action;
//   - loading or failure: <LoadingState> and <ErrorState>, decided before any count is read.
import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, type LucideIcon } from "lucide-react";

import "../overview/overview.css";
import "./empty-state.css";

export interface EmptyStateAction {
  label: string;
  /** A link when set, a button otherwise. */
  to?: string;
  state?: unknown;
  onClick?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  hint?: string;
  /** "bare" is "page" with nothing behind it, directly on the page background. */
  variant?: "page" | "bare" | "card" | "inline";
  /** The level that fits the page around it. */
  headingLevel?: 2 | 3;
  tone?: "brand" | "danger";
  role?: "alert";
  /** Shown under the actions: quick-start cards, a labeled sample chart. */
  children?: ReactNode;
}

function ActionButton({
  action,
  primary,
}: {
  action: EmptyStateAction;
  primary: boolean;
}) {
  const className = `ov-btn${primary ? " ov-btn-primary" : ""}`;
  const Icon = action.icon;
  const content = (
    <>
      {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden />}
      {action.label}
    </>
  );
  if (action.to) {
    return (
      <Link to={action.to} state={action.state} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      onClick={action.onClick}
      disabled={action.disabled}
    >
      {content}
    </button>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  hint,
  variant = "page",
  headingLevel = 2,
  tone = "brand",
  role,
  children,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className="es dz-theme-auto"
      data-variant={variant}
      data-tone={tone}
      role={role}
    >
      <span aria-hidden className="es-icon">
        <Icon size={24} strokeWidth={1.75} />
      </span>
      <Heading className="es-title">{title}</Heading>
      {description && <p className="es-description">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="es-actions">
          {primaryAction && <ActionButton action={primaryAction} primary />}
          {secondaryAction && (
            <ActionButton action={secondaryAction} primary={false} />
          )}
        </div>
      )}
      {hint && <p className="es-hint">{hint}</p>}
      {children && <div className="es-extra">{children}</div>}
    </div>
  );
}

export function ErrorState({
  title = "This could not be loaded",
  message,
  onRetry,
  variant = "page",
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
  variant?: EmptyStateProps["variant"];
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      tone="danger"
      role="alert"
      variant={variant}
      title={title}
      description={message}
      primaryAction={{ label: "Retry", onClick: onRetry }}
    />
  );
}

export function LoadingState({
  rows = 3,
  label = "Loading",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div
      className="es-skeleton dz-theme-auto"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: rows }, (_, row) => (
        <span key={row} className="ov-sk" style={{ height: 56 }} />
      ))}
    </div>
  );
}

/** A greyed, clearly labeled sample: never to be read as the account's own numbers. */
export function GhostChart({ label }: { label: string }) {
  return (
    <div className="es-ghost">
      <svg viewBox="0 0 400 96" preserveAspectRatio="none" aria-hidden>
        <path
          d="M0 80 C 50 72, 80 44, 130 52 S 210 76, 260 40 S 340 22, 400 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="es-ghost-label">{label}</span>
    </div>
  );
}
