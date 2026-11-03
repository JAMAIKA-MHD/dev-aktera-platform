import type { CSSProperties } from "react";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { tint } from "../../../theme/recipes";
import type { SceneCell } from "./spotScene";

// One of the two pictures: a grid of icons. Drawn once and shared by the engine (cells are
// buttons) and the pregame teaser (cells are plain shapes, the picture is not playable).

const TONES = ["--xp-primary", "--xp-secondary", "--xp-accent"] as const;

export interface SpotPanelProps {
  cells: (SceneCell | null)[];
  cols: number;
  found?: ReadonlySet<number>; // cells whose difference has been found: ringed
  wrong?: number | null; // the cell just tapped by mistake: shakes
  highlight?: number | null; // the teaser's own pointer: ringed, but not "found"
  onTap?: (cell: number) => void;
  disabled?: boolean;
  label?: string; // accessible name of a cell, followed by its number
  reducedMotion: boolean;
  style?: CSSProperties;
}

export function SpotPanel({
  cells,
  cols,
  found,
  wrong = null,
  highlight = null,
  onTap,
  disabled = false,
  label = "",
  reducedMotion,
  style,
}: SpotPanelProps) {
  return (
    <span
      data-xp-spot-panel
      className="grid aspect-square overflow-hidden rounded-[var(--xp-radius-lg)] border p-[clamp(0.2rem,1.5cqmin,0.5rem)]"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        backgroundColor: tint("--xp-surface", 72),
        borderColor: tint("--xp-primary", 35),
        ...style,
      }}
    >
      {cells.map((cell, index) => {
        const Icon = cell ? ICON_COMPONENTS[cell.icon] : null;
        const isFound = found?.has(index) ?? false;
        const ringed = isFound || highlight === index;
        const content = (
          <>
            {Icon && cell && (
              <Icon
                aria-hidden
                className="size-[62%]"
                strokeWidth={2.2}
                style={{
                  color: `var(${TONES[cell.tone]})`,
                  transform: `rotate(${cell.tilt}deg)`,
                }}
              />
            )}
            {ringed && (
              <span
                aria-hidden
                data-xp-spot-found={isFound ? "" : undefined}
                className="pointer-events-none absolute inset-[6%] rounded-full border-[3px]"
                style={{
                  borderColor: "var(--xp-accent)",
                  boxShadow: `0 0 0.8rem ${tint("--xp-accent", 60)}`,
                  animation: reducedMotion
                    ? "none"
                    : "xp-pop 380ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
                }}
              />
            )}
          </>
        );
        const common = {
          className:
            "relative grid min-h-[44px] min-w-[44px] place-items-center rounded-[var(--xp-radius-sm)]",
          style: {
            animation:
              wrong === index && !reducedMotion
                ? "xp-shake 380ms ease-in-out"
                : undefined,
            backgroundColor:
              wrong === index ? tint("--xp-accent", 22) : "transparent",
          } satisfies CSSProperties,
        };
        return onTap ? (
          <button
            key={index}
            type="button"
            disabled={disabled || isFound}
            aria-label={`${label} ${index + 1}`}
            aria-pressed={isFound}
            onClick={() => onTap(index)}
            {...common}
            className={`${common.className} cursor-pointer enabled:active:scale-[0.94] disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]`}
          >
            {content}
          </button>
        ) : (
          <span key={index} {...common}>
            {content}
          </span>
        );
      })}
    </span>
  );
}
