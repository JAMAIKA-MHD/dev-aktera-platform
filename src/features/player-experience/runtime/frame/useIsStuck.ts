import { useEffect, useRef, useState, type RefObject } from "react";

// True while a `position: sticky; bottom: …` element is held at the bottom of the viewport,
// that is while its natural place is further down the page. The CTA shows its glass dock
// then. Measured on scroll, resize, layout changes and the end of its entrance animation.
export function useIsStuck<T extends HTMLElement>(): [
  RefObject<T | null>,
  boolean,
] {
  const ref = useRef<T>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const inset = parseFloat(getComputedStyle(element).bottom);
      const line = window.innerHeight - inset;
      // Below its natural place it would be off the line; held there, it sits exactly on it.
      setStuck(
        Number.isFinite(inset) &&
          Math.abs(element.getBoundingClientRect().bottom - line) < 1,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    element.addEventListener("animationend", schedule);
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(schedule)
        : null;
    observer?.observe(document.documentElement);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      element.removeEventListener("animationend", schedule);
      observer?.disconnect();
    };
  }, []);

  return [ref, stuck];
}
