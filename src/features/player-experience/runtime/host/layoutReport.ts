import { useCallback, useEffect, useRef } from "react";
import {
  layoutAudit,
  layoutReport,
  type LayoutIssue,
  type LayoutReport,
} from "../layout/layoutAudit";

// How the frame shares its layout audit (plan §9.3): live with the Studio through the
// preview bridge (xp:layout-report), and with the responsive sweep, which calls
// window.__xpLayoutAudit() in Chrome. Both run layoutAudit on the runtime root.

declare global {
  interface Window {
    __xpLayoutAudit?: () => LayoutIssue[];
  }
}

export const REPORT_DELAY_MS = 150;

// The runtime root (ThemeScope's .xp-runtime), or the body before it exists.
const runtimeRoot = (doc: Document): HTMLElement =>
  doc.querySelector<HTMLElement>(".xp-runtime") ?? doc.body;

export function exposeLayoutAudit(win: Window): () => void {
  win.__xpLayoutAudit = () => layoutAudit(runtimeRoot(win.document));
  return () => {
    delete win.__xpLayoutAudit;
  };
}

// Reports the layout after each render of the caller, each resize and the end of each
// entrance animation, once things have settled (debounced): a burst of renders or a resize
// drag gives one report. Nothing is reported while onReport is null (the Studio has not
// sent a configuration yet).
export function useLayoutReport(
  onReport: ((report: LayoutReport) => void) | null,
): void {
  const latest = useRef(onReport);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => latest.current?.(layoutReport(runtimeRoot(document))),
      REPORT_DELAY_MS,
    );
  }, []);

  // After every render: the configuration, the language or the screen may have changed.
  useEffect(() => {
    latest.current = onReport;
    schedule();
  });

  useEffect(() => {
    window.addEventListener("resize", schedule);
    // Slots rise in with a transform: measured mid-way, a CTA held at the bottom is not
    // stuck yet (useIsStuck) and seems to overlap the content. Looping animations never end.
    document.addEventListener("animationend", schedule);
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(schedule)
        : null;
    observer?.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", schedule);
      document.removeEventListener("animationend", schedule);
      observer?.disconnect();
      clearTimeout(timer.current);
    };
  }, [schedule]);
}
