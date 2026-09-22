import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { BridgeFrame, FrameHost } from "./FrameHost";
import {
  exposeLayoutAudit,
  REPORT_DELAY_MS,
  useLayoutReport,
} from "./layoutReport";
import type { Bridge, FromFrameMessage, ToFrameMessage } from "./previewBridge";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  window.history.pushState({}, "", "/");
  document.body.innerHTML = "";
});

describe("window.__xpLayoutAudit", () => {
  it("runs the layout audit on the runtime root, for the responsive sweep", () => {
    const hide = exposeLayoutAudit(window);
    expect(window.__xpLayoutAudit?.()).toEqual([]); // nothing laid out in jsdom
    const root = document.createElement("div");
    root.className = "xp-runtime";
    document.body.appendChild(root);
    expect(window.__xpLayoutAudit?.()).toEqual([]);
    hide();
    expect(window.__xpLayoutAudit).toBeUndefined();
  });

  it("is there as long as the frame is", () => {
    window.history.pushState({}, "", "/xp-frame?fixture=layout-debug");
    const { unmount } = render(<FrameHost />);
    expect(typeof window.__xpLayoutAudit).toBe("function");
    unmount();
    expect(window.__xpLayoutAudit).toBeUndefined();
  });
});

describe("useLayoutReport", () => {
  it("reports once things have settled: one report for a burst of renders", () => {
    const onReport = vi.fn();
    const { rerender } = renderHook(() => useLayoutReport(onReport));
    rerender();
    rerender();
    act(() => vi.advanceTimersByTime(REPORT_DELAY_MS - 1));
    expect(onReport).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onReport).toHaveBeenCalledOnce();
    expect(onReport).toHaveBeenCalledWith({
      width: 1024,
      height: 768,
      mode: {
        arrangement: "split",
        density: "regular",
        compact: false,
        wide: true,
      },
      issues: [],
    });
  });

  it("reports again after a resize, and stops when it leaves", () => {
    const onReport = vi.fn();
    const { unmount } = renderHook(() => useLayoutReport(onReport));
    act(() => vi.advanceTimersByTime(REPORT_DELAY_MS));
    act(() => {
      window.dispatchEvent(new Event("resize"));
      vi.advanceTimersByTime(REPORT_DELAY_MS);
    });
    expect(onReport).toHaveBeenCalledTimes(2);
    act(() => window.dispatchEvent(new Event("resize")));
    unmount();
    act(() => vi.advanceTimersByTime(REPORT_DELAY_MS));
    expect(onReport).toHaveBeenCalledTimes(2);
  });

  it("reports again once an entrance animation has ended", () => {
    const onReport = vi.fn();
    const { unmount } = renderHook(() => useLayoutReport(onReport));
    act(() => vi.advanceTimersByTime(REPORT_DELAY_MS));
    const slot = document.createElement("div");
    document.body.appendChild(slot);
    act(() => {
      // The CTA has risen into place: now it can be held at the bottom (data-xp-stuck).
      slot.dispatchEvent(new Event("animationend", { bubbles: true }));
      vi.advanceTimersByTime(REPORT_DELAY_MS);
    });
    expect(onReport).toHaveBeenCalledTimes(2);
    unmount();
    act(() => {
      slot.dispatchEvent(new Event("animationend", { bubbles: true }));
      vi.advanceTimersByTime(REPORT_DELAY_MS);
    });
    expect(onReport).toHaveBeenCalledTimes(2);
  });

  it("reports again when the page changes size (ResizeObserver)", () => {
    let notify = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const onReport = vi.fn();
    const { unmount } = renderHook(() => useLayoutReport(onReport));
    act(() => vi.advanceTimersByTime(REPORT_DELAY_MS));
    act(() => {
      notify(); // content grew: a new section, a longer text
      vi.advanceTimersByTime(REPORT_DELAY_MS);
    });
    expect(onReport).toHaveBeenCalledTimes(2);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("reports nothing while there is nobody to tell", () => {
    const { rerender } = renderHook(
      ({ onReport }: { onReport: (() => void) | null }) =>
        useLayoutReport(onReport),
      { initialProps: { onReport: null as (() => void) | null } },
    );
    act(() => vi.advanceTimersByTime(REPORT_DELAY_MS));
    const onReport = vi.fn();
    rerender({ onReport });
    act(() => vi.advanceTimersByTime(REPORT_DELAY_MS));
    expect(onReport).toHaveBeenCalledOnce();
  });
});

describe("xp:layout-report", () => {
  it("tells the Studio how the preview is laid out, once it has a configuration", () => {
    let deliver: (message: ToFrameMessage) => void = () => {};
    const posted: FromFrameMessage[] = [];
    const bridge: Bridge<FromFrameMessage, ToFrameMessage> = {
      post: (message) => posted.push(message),
      subscribe: (listener) => {
        deliver = listener;
        return () => {};
      },
    };
    render(<BridgeFrame bridge={bridge} />);
    act(() => vi.advanceTimersByTime(REPORT_DELAY_MS));
    expect(posted.map((message) => message.type)).toEqual(["xp:ready"]);
    act(() =>
      deliver({
        type: "xp:config",
        config: createDefaultExperience({ gameType: "quiz" }),
        campaign: createDemoCampaign("quiz"),
      }),
    );
    act(() => vi.advanceTimersByTime(REPORT_DELAY_MS));
    const report = posted.at(-1);
    expect(report).toMatchObject({
      type: "xp:layout-report",
      width: 1024,
      height: 768,
      mode: { arrangement: "split", density: "regular" },
    });
    // jsdom lays nothing out: every box is 0 x 0, so the CTA of the journey's welcome screen
    // reads as too small. Proof that the audit runs on the real frame, with the field to open.
    expect(report?.type === "xp:layout-report" && report.issues).toContainEqual(
      expect.objectContaining({
        kind: "cta-too-small",
        editPath: "screens.welcome.primaryCta",
      }),
    );
  });
});
