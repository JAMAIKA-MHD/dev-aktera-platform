import { useEffect, type RefObject } from "react";
import { useStudio } from "./StudioContext";

// Brings the field of ui.focusPath into view once its panel is drawn: after a click in the
// preview (xp:edit-target) or on an issue. The closest field wins: the exact path, else the
// deepest field containing it, else the first field inside it ("screens.welcome.title" finds
// the title field; "form" finds the first field of the form).

export function findFieldFor(
  root: HTMLElement,
  path: string,
): HTMLElement | null {
  const fields = [...root.querySelectorAll<HTMLElement>("[data-studio-path]")];
  let best: HTMLElement | null = null;
  let bestScore = -1;
  for (const field of fields) {
    const candidate = field.dataset.studioPath ?? "";
    let score = -1;
    if (candidate === path) score = 1000;
    else if (path.startsWith(`${candidate}.`)) score = candidate.length;
    else if (candidate.startsWith(`${path}.`)) score = 500; // the first one, in reading order
    if (score > bestScore) {
      best = field;
      bestScore = score;
    }
  }
  return best;
}

export function useRevealFocusPath(container: RefObject<HTMLElement | null>) {
  const panel = useStudio((state) => state.ui.panel);
  const path = useStudio((state) => state.ui.focusPath);
  useEffect(() => {
    if (!path || !container.current) return;
    const field = findFieldFor(container.current, path);
    if (!field) return;
    field.scrollIntoView?.({ block: "center", behavior: "smooth" });
    field
      .querySelector<HTMLElement>("input, textarea, select, button")
      ?.focus({ preventScroll: true });
    field.dataset.studioFlash = "true";
    const timer = setTimeout(() => delete field.dataset.studioFlash, 1600);
    return () => clearTimeout(timer);
  }, [container, panel, path]);
}
