import { BREAKPOINTS } from "./breakpoints";

// Two axes computed on the document's viewport (the simulated device inside the preview
// iframe): arrangement (stack or split) and density (tight, regular, roomy), plus the
// compact and wide width tiers (plan §8.3).

export type Arrangement = "stack" | "split";
export type Density = "tight" | "regular" | "roomy";

export interface LayoutMode {
  arrangement: Arrangement;
  density: Density;
  compact: boolean;
  wide: boolean;
}

// Pure: same rules as the CSS variants of layout.css.
export function computeLayoutMode(width: number, height: number): LayoutMode {
  const split =
    width >= BREAKPOINTS.splitMinWidth &&
    width / height >= BREAKPOINTS.splitMinAspect;
  return {
    arrangement: split ? "split" : "stack",
    density:
      height <= BREAKPOINTS.tightMaxHeight
        ? "tight"
        : height >= BREAKPOINTS.roomyMinHeight
          ? "roomy"
          : "regular",
    compact: width <= BREAKPOINTS.compactMaxWidth,
    wide: width >= BREAKPOINTS.wideMinWidth,
  };
}

// "stack · regular · compact": shown by the preview and the layout-debug fixture.
export function describeLayoutMode(mode: LayoutMode): string {
  return [mode.arrangement, mode.density, mode.compact ? "compact" : null]
    .filter(Boolean)
    .join(" · ");
}
