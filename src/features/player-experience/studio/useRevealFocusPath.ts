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

// Scrolls the panel's own scroller only: scrollIntoView would also move every scrollable
// ancestor, the Studio's frame or the dashboard page included.
function scrollerOf(element: HTMLElement): HTMLElement | null {
  let scroller = element.parentElement;
  while (
    scroller &&
    !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)
  ) {
    scroller = scroller.parentElement;
  }
  return scroller;
}

function scrollPanelTo(field: HTMLElement) {
  const scroller = scrollerOf(field);
  if (!scroller) return;
  const top =
    field.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  // Centered when it fits; a field taller than the panel shows its beginning.
  const offset =
    field.offsetHeight < scroller.clientHeight
      ? top - (scroller.clientHeight - field.offsetHeight) / 2
      : top - 16;
  scroller.scrollTo?.({ top: scroller.scrollTop + offset, behavior: "smooth" });
}

export function useRevealFocusPath(container: RefObject<HTMLElement | null>) {
  const panel = useStudio((state) => state.ui.panel);
  const path = useStudio((state) => state.ui.focusPath);
  useEffect(() => {
    if (!container.current) return;
    // Another panel, and no field to show: start at its top.
    if (!path) {
      const scroller = scrollerOf(container.current);
      if (scroller) scroller.scrollTop = 0;
      return;
    }
    const field = findFieldFor(container.current, path);
    if (!field) return;
    scrollPanelTo(field);
    field
      .querySelector<HTMLElement>(
        "input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)",
      )
      ?.focus({ preventScroll: true });
    field.dataset.studioFlash = "true";
    const timer = setTimeout(() => delete field.dataset.studioFlash, 1600);
    return () => clearTimeout(timer);
  }, [container, panel, path]);
}
