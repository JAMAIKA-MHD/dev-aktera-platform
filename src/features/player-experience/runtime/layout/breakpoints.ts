// The single source of the runtime's breakpoints (plan §8.3). layout.css exposes the same
// values as Tailwind variants (split:, tight:, roomy:, compact:, wide:), and
// layoutMode.test.ts checks that both files agree. No magic number anywhere else.

// Every size of this envelope must render without horizontal scroll, overlap, clipped text
// or unreachable CTA, in portrait and landscape.
export const ENVELOPE = {
  minWidth: 280,
  maxWidth: 2560,
  minHeight: 320,
  maxHeight: 1600,
} as const;

export const BREAKPOINTS = {
  compactMaxWidth: 359, // < 360 px: compact tier (narrow margins, wrapped chips)
  wideMinWidth: 600, // centred column capped at about 640 px
  splitMinWidth: 560, // with a landscape ratio: two panes
  splitMinAspect: 6 / 5,
  tightMaxHeight: 599, // < 600 px high: tight density
  roomyMinHeight: 900, // ≥ 900 px high: roomy density
} as const;

// Media queries of the variants, built from BREAKPOINTS.
export const MEDIA_QUERIES = {
  compact: `(max-width: ${BREAKPOINTS.compactMaxWidth}px)`,
  wide: `(min-width: ${BREAKPOINTS.wideMinWidth}px)`,
  split: `(min-aspect-ratio: 6/5) and (min-width: ${BREAKPOINTS.splitMinWidth}px)`,
  tight: `(max-height: ${BREAKPOINTS.tightMaxHeight}px)`,
  roomy: `(min-height: ${BREAKPOINTS.roomyMinHeight}px)`,
} as const;

export type LayoutVariant = keyof typeof MEDIA_QUERIES;
