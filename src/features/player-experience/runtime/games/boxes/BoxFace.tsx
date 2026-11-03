import type { CSSProperties, ReactNode } from "react";
import type { IconName } from "../../../domain/icons";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { tint } from "../../../theme/recipes";

// One mystery box, drawn once and shared by the engine and the pregame teaser (plan §8.7):
// the brand's own icon and colour, a lid that lifts, and a glow underneath. Pure drawing —
// it decides nothing, and what it shows through an open lid is handed to it.

export type BoxState = "closed" | "picked" | "shaking" | "open" | "dimmed";

export interface BoxFaceProps {
  icon: IconName;
  color: string | null; // the brand's own, or the theme's
  state: BoxState;
  children?: ReactNode; // what an open box shows; never anything for a teaser (rule 1)
  style?: CSSProperties;
}

export function BoxFace({ icon, color, state, children, style }: BoxFaceProps) {
  const Icon = ICON_COMPONENTS[icon];
  // The brand's own color first, then the template's box, then the brand's primary.
  const skin = color ?? "var(--xp-box-body, var(--xp-primary))";
  const lid =
    color ?? "var(--xp-box-lid, var(--xp-box-body, var(--xp-primary)))";
  const edge = `var(--xp-box-border, ${tint("--xp-surface", 55)})`;
  const open = state === "open";
  return (
    <span
      data-xp-box
      data-xp-box-state={state}
      className="xp-box relative block aspect-square w-full"
      style={{ opacity: state === "dimmed" ? 0.45 : 1, ...style }}
    >
      {/* The glow that escapes once the lid is up. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full blur-xl transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle, var(--xp-box-glow, ${tint("--xp-primary", 60)}), transparent 70%)`,
          opacity: open ? 1 : 0,
        }}
      />
      {/* The body. */}
      <span
        className="absolute inset-x-0 bottom-0 top-[20%] grid place-items-center overflow-hidden rounded-b-[var(--xp-box-radius,var(--xp-radius-md))] border"
        style={{
          background: `linear-gradient(160deg, color-mix(in srgb, ${skin} 85%, var(--xp-surface)), color-mix(in srgb, ${skin} 45%, var(--xp-surface)))`,
          borderColor: edge,
          borderWidth: "var(--xp-box-border-width, 1px)",
        }}
      >
        {/* The template's ribbon down the body, when it draws one. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 inset-x-[42%]"
          style={{ backgroundColor: "var(--xp-box-ribbon, transparent)" }}
        />
        {open ? (
          <span className="xp-box-content grid place-items-center px-1 text-center">
            {children}
          </span>
        ) : (
          <Icon
            aria-hidden
            className="relative size-[42%]"
            strokeWidth={1.75}
            style={{ color: "var(--xp-box-icon, var(--xp-on-primary))" }}
          />
        )}
      </span>
      {/* The lid, which lifts and tips over when the box opens. */}
      <span
        aria-hidden
        // The lid sits on the box, overlapping it: a gap between the two would read as two
        // separate shapes rather than one closed box.
        className="xp-box-lid absolute inset-x-[-5%] top-0 h-[27%] overflow-hidden rounded-t-[var(--xp-box-radius,var(--xp-radius-sm))] border transition-transform duration-500 ease-out"
        style={{
          background: `linear-gradient(90deg, transparent 42%, var(--xp-box-ribbon, transparent) 42% 58%, transparent 58%), linear-gradient(160deg, color-mix(in srgb, ${lid} 95%, var(--xp-surface)), color-mix(in srgb, ${lid} 60%, var(--xp-surface)))`,
          borderColor: edge,
          borderWidth: "var(--xp-box-border-width, 1px)",
          transformOrigin: "left bottom",
          transform: open
            ? "translateY(-55%) rotate(-18deg)"
            : state === "picked"
              ? "translateY(-10%)"
              : "none",
        }}
      />
    </span>
  );
}
