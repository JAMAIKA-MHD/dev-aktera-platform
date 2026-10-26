import type { ButtonHTMLAttributes, ReactNode } from "react";
import { scriptOf } from "../frame/text";

// The buttons of the player screens (shell.css, .xp-btn): the theme's primary button (its
// gradient, border, radius and pressed shadow), the quieter secondary one, and a ghost for a
// plain link. Only --xp-btn-* and --xp-btn2-* variables: a theme changes every button at once.
// Loading keeps the button bright and focusable: it is busy, not unavailable.

export type GameButtonVariant = "primary" | "secondary" | "ghost";

export interface GameButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  variant?: GameButtonVariant;
  label: string;
  icon?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  shimmer?: boolean; // the light sweeping across the main button
  className?: string;
}

export function GameButton({
  variant = "primary",
  label,
  icon,
  loading = false,
  loadingLabel,
  shimmer = false,
  disabled = false,
  className = "",
  onClick,
  type = "button",
  ...rest
}: GameButtonProps) {
  const shown = loading && loadingLabel ? loadingLabel : label;
  return (
    <button
      {...rest}
      type={type}
      data-xp-variant={variant}
      data-xp-script={scriptOf(shown)}
      disabled={disabled && !loading}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (!loading) onClick?.(event);
      }}
      className={`xp-btn ${className}`}
    >
      {shimmer && !disabled && !loading && (
        <span aria-hidden className="xp-shimmer" />
      )}
      {loading ? (
        <span
          aria-hidden
          className="xp-spin size-5 shrink-0 rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      <span
        dir="auto"
        data-xp-script={scriptOf(shown)}
        className="min-w-0 wrap-anywhere"
      >
        {shown}
      </span>
    </button>
  );
}
