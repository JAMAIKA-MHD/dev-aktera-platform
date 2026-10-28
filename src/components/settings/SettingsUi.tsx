import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { Check, ChevronDown, Eye, EyeOff, Info, X } from "lucide-react";

// The parts of the Organization settings page (organizationSettings.css), built once and
// reused by every tab: cards, fields, inputs, selects, switches, badges, notes, tiles, chips,
// empty states, skeletons and the sticky save bar. Look only — every value and handler comes
// from the page.

export function SettingsCard({
  title,
  description,
  aside,
  children,
  labelledBy,
  flush = false,
}: {
  title: ReactNode;
  description?: string;
  aside?: ReactNode; // a badge or a button beside the title
  children: ReactNode;
  labelledBy: string;
  flush?: boolean; // a list of rows straight in the card
}) {
  return (
    <section className="os-card" aria-labelledby={labelledBy}>
      <header className="os-card-header">
        <div>
          <h3 id={labelledBy} className="os-card-title">
            {title}
          </h3>
          {description && <p className="os-card-desc">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="os-card-body" data-flush={flush ? "" : undefined}>
        {children}
      </div>
    </section>
  );
}

// One status row in a card of its own (a bot, two-step verification, the plan).
export function CompactCard({
  labelledBy,
  tile,
  title,
  badge,
  description,
  actions,
  children,
}: {
  labelledBy: string;
  tile?: ReactNode;
  title: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="os-card os-card-compact" aria-labelledby={labelledBy}>
      {tile}
      <div className="os-card-compact-main">
        <div className="os-title-row">
          <h3 id={labelledBy} className="os-card-title">
            {title}
          </h3>
          {badge}
        </div>
        {description && <p className="os-card-desc">{description}</p>}
        {children}
      </div>
      {actions}
    </section>
  );
}

export function IconTile({
  children,
  variant = "brand",
}: {
  children: ReactNode;
  variant?: "brand" | "small" | "outline";
}) {
  const className =
    variant === "outline"
      ? "os-tile os-tile-outline"
      : variant === "small"
        ? "os-tile os-tile-sm"
        : "os-tile";
  return (
    <span aria-hidden className={className}>
      {children}
    </span>
  );
}

export function Divider() {
  return <hr className="os-divider" />;
}

export function Skeleton({
  height = 44,
  width = "100%",
}: {
  height?: number;
  width?: number | string;
}) {
  return (
    <span
      aria-hidden
      className="os-skeleton"
      style={{ display: "block", height, width }}
    />
  );
}

// A label above its control, a help line or an error under it. The error replaces the help
// once the field has been left with a wrong value (checked on blur, never while typing).
export function Field({
  id,
  label,
  labelAside,
  optional = false,
  optionalLabel = "optional",
  help,
  error,
  full = false,
  className = "",
  children,
}: {
  id: string;
  label: string;
  labelAside?: ReactNode; // a badge beside the label ("Verified")
  optional?: boolean;
  optionalLabel?: string;
  help?: string;
  error?: string | null;
  full?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`os-field ${full ? "os-full" : ""} ${className}`}>
      <div className="os-label-row">
        <label htmlFor={id} className="os-label">
          {label}
          {optional && <span className="os-optional"> · {optionalLabel}</span>}
        </label>
        {labelAside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="os-error" role="alert">
          {error}
        </p>
      ) : (
        help && (
          <p id={`${id}-help`} className="os-help">
            {help}
          </p>
        )
      )}
    </div>
  );
}

// The ids a control points to for its help or error line.
export function describedBy(
  id: string,
  { help, error }: { help?: string; error?: string | null },
): string | undefined {
  if (error) return `${id}-error`;
  return help ? `${id}-help` : undefined;
}

export function TextInput({
  mono = false,
  invalid = false,
  className = "",
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  mono?: boolean;
  invalid?: boolean;
}) {
  return (
    <input
      {...input}
      aria-invalid={invalid || undefined}
      className={`os-input ${mono ? "os-mono" : ""} ${className}`}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  small = false,
  ...select
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  small?: boolean; // inline in a row (a member's role)
}) {
  return (
    <div className="os-select-wrap">
      <select
        {...select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`os-input os-select ${small ? "os-select-sm" : ""}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="os-select-chevron" strokeWidth={2} />
    </div>
  );
}

export function PasswordInput({
  showLabel,
  hideLabel,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  showLabel: string;
  hideLabel: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="os-password-wrap">
      <input
        {...input}
        type={shown ? "text" : "password"}
        className="os-input"
      />
      <button
        type="button"
        className="os-eye"
        aria-label={shown ? hideLabel : showLabel}
        aria-pressed={shown}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? (
          <EyeOff aria-hidden size={18} strokeWidth={2} />
        ) : (
          <Eye aria-hidden size={18} strokeWidth={2} />
        )}
      </button>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  labelledBy,
  label,
  describedById,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy?: string;
  label?: string; // when no visible text names it ("Player traffic surge by Email")
  describedById?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={label}
      aria-describedby={describedById}
      disabled={disabled}
      className="os-switch"
      onClick={() => onChange(!checked)}
    />
  );
}

export function Badge({
  tone,
  className = "",
  children,
}: {
  tone: "ok" | "warn" | "neutral" | "brand" | "danger";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`os-badge os-badge-${tone} ${className}`}>{children}</span>
  );
}

export function Note({
  tone = "info",
  icon,
  title,
  children,
  live = false,
}: {
  tone?: "info" | "danger" | "ok";
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  live?: boolean;
}) {
  return (
    <div
      className={tone === "info" ? "os-note" : `os-note os-note-${tone}`}
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
    >
      {icon ?? <Info aria-hidden strokeWidth={2} />}
      <div>
        {title && <p className="os-note-title">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function Chip({
  label,
  removeLabel,
  onRemove,
}: {
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <span className="os-chip">
      <span dir="auto">{label}</span>
      <button
        type="button"
        className="os-chip-remove"
        aria-label={removeLabel}
        onClick={onRemove}
      >
        <X aria-hidden strokeWidth={2} />
      </button>
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="os-empty">
      {icon && <IconTile variant="small">{icon}</IconTile>}
      <p className="os-empty-title">{title}</p>
      <p className="os-empty-desc">{description}</p>
      {action}
    </div>
  );
}

// The sticky bar of a long form: where its changes stand, and Discard / Save, both
// unavailable until something has changed.
export function SaveBar({
  dirty,
  saving,
  onDiscard,
  saveIcon,
  labels,
}: {
  dirty: boolean;
  saving: boolean;
  onDiscard: () => void;
  saveIcon: ReactNode;
  labels: {
    unsaved: string;
    saved: string;
    discard: string;
    save: string;
    saving: string;
  };
}) {
  return (
    <div className="os-savebar">
      <p
        className="os-savebar-state"
        data-saved={dirty ? undefined : ""}
        aria-live="polite"
      >
        {dirty ? (
          <>
            <span aria-hidden className="os-dot" />
            {labels.unsaved}
          </>
        ) : (
          <>
            <Check aria-hidden strokeWidth={2.5} />
            {labels.saved}
          </>
        )}
      </p>
      <div className="os-savebar-actions">
        <button
          type="button"
          className="os-btn os-btn-secondary"
          disabled={!dirty || saving}
          onClick={onDiscard}
        >
          {labels.discard}
        </button>
        {/* Saving keeps the bar still: the label changes, never the layout. */}
        <button
          type="submit"
          className="os-btn os-btn-primary"
          disabled={!dirty || saving}
          aria-busy={saving || undefined}
        >
          {saveIcon}
          {saving ? labels.saving : labels.save}
        </button>
      </div>
    </div>
  );
}
