import type { ReactNode } from "react";

// The HUD (heads-up display) of a game: small chips over the game — what is at stake, how
// many tries, a countdown — in the theme's HUD colors (shell.css, --xp-hud-*). Display only:
// a chip never decides anything, it shows what the journey already knows.

export function Hud({
  label,
  children,
}: {
  label: string; // names the group for screen readers
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-xp-hud
      className="flex flex-wrap items-center justify-center gap-[var(--xp-space-xs)]"
    >
      {children}
    </div>
  );
}

export function HudChip({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="xp-hud-chip">
      {icon && (
        <span aria-hidden className="grid size-4 shrink-0 place-items-center">
          {icon}
        </span>
      )}
      <span dir="auto" className="min-w-0 truncate">
        {children}
      </span>
    </span>
  );
}
