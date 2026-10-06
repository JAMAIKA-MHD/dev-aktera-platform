import { BREAKPOINTS } from "../../runtime/layout/breakpoints";
import { computeLayoutMode } from "../../runtime/layout/layoutMode";
import { useStudio } from "../StudioContext";
import { clampToEnvelope, type Size } from "./viewportMath";

// The runtime's layout tiers, read from breakpoints.ts (the single source, RWD3): where the
// screen changes its arrangement. The tier on show is highlighted; a click sets the preview
// to a size of that tier, in Responsive mode.

type Tier = "compact" | "stack" | "centered" | "split";

interface TierInfo {
  id: Tier;
  label: string;
  range: string;
  size: (current: Size) => Size;
}

export const TIERS: readonly TierInfo[] = [
  {
    id: "compact",
    label: "Compact",
    range: `< ${BREAKPOINTS.compactMaxWidth + 1}`,
    size: (current) => ({ width: 320, height: current.height }),
  },
  {
    id: "stack",
    label: "One column",
    range: `${BREAKPOINTS.compactMaxWidth + 1}+`,
    size: (current) => ({ width: 390, height: current.height }),
  },
  {
    id: "centered",
    label: "Centered",
    range: `${BREAKPOINTS.wideMinWidth}+`,
    size: (current) => ({ width: 768, height: Math.max(current.height, 1024) }),
  },
  {
    id: "split",
    label: "Two panes",
    range: `${BREAKPOINTS.splitMinWidth}+ wide`,
    // A landscape size wide enough for the split, whatever the current height.
    size: () => ({ width: 1280, height: 800 }),
  },
];

export function tierOf(size: Size): Tier {
  const mode = computeLayoutMode(size.width, size.height);
  if (mode.arrangement === "split") return "split";
  if (mode.compact) return "compact";
  return mode.wide ? "centered" : "stack";
}

export function BreakpointRuler() {
  const viewport = useStudio((state) => state.ui.viewport);
  const setViewport = useStudio((state) => state.setViewport);
  const current = tierOf(viewport);
  return (
    <div
      role="group"
      aria-label="Layout tiers"
      className="grid grid-cols-4 gap-1"
    >
      {TIERS.map((tier) => {
        const active = tier.id === current;
        return (
          <button
            key={tier.id}
            type="button"
            aria-pressed={active}
            title={`Set the preview to a ${tier.label.toLowerCase()} size`}
            onClick={() => {
              const size = clampToEnvelope(tier.size(viewport));
              setViewport({
                deviceId: null,
                ...size,
                orientation:
                  size.width > size.height ? "landscape" : "portrait",
              });
            }}
            className={`flex min-h-9 flex-col items-center justify-center rounded-md border-b-2 px-1 text-[10px] font-bold leading-tight transition active:scale-95 focus-visible:outline-2 focus-visible:outline-blue-500 ${
              active
                ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                : "border-card-border text-brand-text-muted hover:bg-card-hover hover:text-brand-text"
            }`}
          >
            <span>{tier.label}</span>
            <span className="font-medium tabular-nums opacity-70">
              {tier.range}
            </span>
          </button>
        );
      })}
    </div>
  );
}
