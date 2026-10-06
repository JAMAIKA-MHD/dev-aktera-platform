import { useEffect, useState, type RefObject } from "react";

// True while a pregame teaser can be seen: its element on screen (IntersectionObserver) and
// the tab visible (visibilitychange). Otherwise the teaser pauses: nothing loops unseen
// (plan §8.7, rule 4). Without IntersectionObserver, the element counts as on screen.
export function useTeaserActivity(ref: RefObject<Element | null>): boolean {
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    () => document.visibilityState !== "hidden",
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) setOnScreen(last.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const update = () => setTabVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return onScreen && tabVisible;
}
