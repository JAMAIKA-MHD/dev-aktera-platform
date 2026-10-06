import { useSyncExternalStore } from "react";

// True when motion must be reduced: the player asked the system for it
// (prefers-reduced-motion), or the brand turned animations off (features.animations).
// Games and teasers then switch to short fades or still images (D13, RWD7); the frame does
// the same for its own motions in CSS (frame.css).

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

const systemPrefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;

export function useReducedMotion(animationsEnabled: boolean): boolean {
  const system = useSyncExternalStore(subscribe, systemPrefersReducedMotion);
  return system || !animationsEnabled;
}
