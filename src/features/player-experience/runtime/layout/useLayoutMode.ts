import { useSyncExternalStore } from "react";
import { MEDIA_QUERIES } from "./breakpoints";
import { computeLayoutMode, type LayoutMode } from "./layoutMode";

// The layout mode of the current document, kept up to date on resize and rotation.
// matchMedia uses exactly the media queries of the CSS variants, so JavaScript and CSS
// always switch at the same pixel. Without matchMedia (tests), the window size is used.

function readLayoutMode(win: Window): LayoutMode {
  if (typeof win.matchMedia !== "function") {
    return computeLayoutMode(win.innerWidth, win.innerHeight);
  }
  const matches = (query: string) => win.matchMedia(query).matches;
  return {
    arrangement: matches(MEDIA_QUERIES.split) ? "split" : "stack",
    density: matches(MEDIA_QUERIES.tight)
      ? "tight"
      : matches(MEDIA_QUERIES.roomy)
        ? "roomy"
        : "regular",
    compact: matches(MEDIA_QUERIES.compact),
    wide: matches(MEDIA_QUERIES.wide),
  };
}

let cached: LayoutMode | null = null;

// useSyncExternalStore needs the same object while nothing changed.
function getSnapshot(): LayoutMode {
  const next = readLayoutMode(window);
  if (
    cached &&
    cached.arrangement === next.arrangement &&
    cached.density === next.density &&
    cached.compact === next.compact &&
    cached.wide === next.wide
  ) {
    return cached;
  }
  cached = next;
  return next;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") {
    window.addEventListener("resize", onChange);
    return () => window.removeEventListener("resize", onChange);
  }
  const lists = Object.values(MEDIA_QUERIES).map((query) =>
    window.matchMedia(query),
  );
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () =>
    lists.forEach((list) => list.removeEventListener("change", onChange));
}

export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribe, getSnapshot);
}
