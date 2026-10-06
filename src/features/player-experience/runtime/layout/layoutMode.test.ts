import { act, render, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BREAKPOINTS, ENVELOPE, MEDIA_QUERIES } from "./breakpoints";
import { computeLayoutMode, describeLayoutMode } from "./layoutMode";
import { ensureViewportFitCover, safeAreaStyle } from "./safeArea";
import { useElementSize, type ElementSize } from "./useElementSize";
import { useLayoutMode } from "./useLayoutMode";

const here = dirname(fileURLToPath(import.meta.url));
const mode = (width: number, height: number) =>
  describeLayoutMode(computeLayoutMode(width, height));

afterEach(() => {
  vi.unstubAllGlobals();
  document.head
    .querySelectorAll('meta[name="viewport"]')
    .forEach((meta) => meta.remove());
});

describe("computeLayoutMode", () => {
  it("gives the modes of the plan's examples (§8.3)", () => {
    expect(mode(360, 800)).toBe("stack · regular"); // entry-level Android
    expect(mode(844, 390)).toBe("split · tight"); // phone in landscape
    expect(mode(834, 1194)).toBe("stack · roomy"); // iPad Pro 11"
    expect(mode(1366, 657)).toBe("split · regular"); // laptop, visible area
    expect(mode(1920, 969)).toBe("split · roomy"); // FHD screen, visible area
    expect(mode(280, 653)).toBe("stack · regular · compact"); // folded phone
  });

  it("switches at each threshold, exactly", () => {
    // Split needs 560 px of width…
    expect(computeLayoutMode(559, 400).arrangement).toBe("stack");
    expect(computeLayoutMode(560, 400).arrangement).toBe("split");
    // …and a 6/5 landscape ratio.
    expect(computeLayoutMode(595, 500).arrangement).toBe("stack"); // 1.19
    expect(computeLayoutMode(600, 500).arrangement).toBe("split"); // 1.20
    // Density follows the height.
    expect(computeLayoutMode(400, 599).density).toBe("tight");
    expect(computeLayoutMode(400, 600).density).toBe("regular");
    expect(computeLayoutMode(400, 899).density).toBe("regular");
    expect(computeLayoutMode(400, 900).density).toBe("roomy");
    // Width tiers.
    expect(computeLayoutMode(359, 700).compact).toBe(true);
    expect(computeLayoutMode(360, 700).compact).toBe(false);
    expect(computeLayoutMode(599, 900).wide).toBe(false);
    expect(computeLayoutMode(600, 900).wide).toBe(true);
  });

  it("covers the corners of the envelope", () => {
    const { minWidth, maxWidth, minHeight, maxHeight } = ENVELOPE;
    expect(mode(minWidth, minHeight)).toBe("stack · tight · compact");
    expect(mode(maxWidth, minHeight)).toBe("split · tight");
    expect(mode(minWidth, maxHeight)).toBe("stack · roomy · compact");
    expect(mode(maxWidth, maxHeight)).toBe("split · roomy");
  });
});

describe("layout.css", () => {
  it("declares the same breakpoints as breakpoints.ts", () => {
    const css = readFileSync(resolve(here, "layout.css"), "utf8");
    for (const [variant, query] of Object.entries(MEDIA_QUERIES)) {
      expect(css).toContain(`@custom-variant ${variant} (@media ${query});`);
    }
    // And the numbers of the queries are those of BREAKPOINTS.
    expect(MEDIA_QUERIES.split).toContain(`${BREAKPOINTS.splitMinWidth}px`);
    expect(6 / 5).toBe(BREAKPOINTS.splitMinAspect);
    const declared = css.match(/@custom-variant \w+/g) ?? [];
    expect(declared).toHaveLength(Object.keys(MEDIA_QUERIES).length);
  });

  it("uses the viewport height on the runtime root only", () => {
    const css = readFileSync(resolve(here, "layout.css"), "utf8");
    expect(css).toContain("min-height: 100dvh;");
    expect(css.match(/\d+d?vh/g)).toEqual(["100dvh"]);
  });
});

describe("useLayoutMode", () => {
  it("follows the window size when matchMedia is missing", () => {
    vi.stubGlobal("innerWidth", 844);
    vi.stubGlobal("innerHeight", 390);
    const { result } = renderHook(() => useLayoutMode());
    expect(describeLayoutMode(result.current)).toBe("split · tight");
    act(() => {
      vi.stubGlobal("innerWidth", 360);
      vi.stubGlobal("innerHeight", 800);
      window.dispatchEvent(new Event("resize"));
    });
    expect(describeLayoutMode(result.current)).toBe("stack · regular");
  });

  it("uses the CSS media queries when matchMedia exists, and follows their changes", () => {
    const active = new Set<string>([MEDIA_QUERIES.split, MEDIA_QUERIES.roomy]);
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: active.has(query),
      addEventListener: (_: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        listeners.delete(listener),
    }));
    const { result, unmount } = renderHook(() => useLayoutMode());
    expect(result.current).toEqual({
      arrangement: "split",
      density: "roomy",
      compact: false,
      wide: false,
    });
    const first = result.current;
    act(() => {
      active.clear();
      active.add(MEDIA_QUERIES.tight);
      active.add(MEDIA_QUERIES.compact);
      listeners.forEach((listener) => listener());
    });
    expect(describeLayoutMode(result.current)).toBe("stack · tight · compact");
    expect(result.current).not.toBe(first);
    act(() => {
      active.clear();
      active.add(MEDIA_QUERIES.wide);
      listeners.forEach((listener) => listener());
    });
    expect(result.current).toEqual({
      arrangement: "stack",
      density: "regular",
      compact: false,
      wide: true,
    });
    unmount();
    expect(listeners.size).toBe(0); // unsubscribed
  });

  it("keeps the same object while the mode does not change", () => {
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    const { result } = renderHook(() => useLayoutMode());
    const first = result.current;
    act(() => {
      vi.stubGlobal("innerWidth", 391);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBe(first);
  });
});

describe("safe areas", () => {
  it("overrides the insets for the preview, or keeps the device ones", () => {
    expect(safeAreaStyle(null)).toEqual({});
    expect(safeAreaStyle({ top: 47, right: 0, bottom: 34, left: 0 })).toEqual({
      "--xp-safe-top": "47px",
      "--xp-safe-right": "0px",
      "--xp-safe-bottom": "34px",
      "--xp-safe-left": "0px",
    });
  });

  it("adds viewport-fit=cover to the viewport meta, once", () => {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1.0";
    document.head.appendChild(meta);
    ensureViewportFitCover(document);
    ensureViewportFitCover(document);
    expect(meta.content).toBe(
      "width=device-width, initial-scale=1.0, viewport-fit=cover",
    );
  });

  it("creates the viewport meta when the document has none", () => {
    ensureViewportFitCover(document);
    const meta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );
    expect(meta?.content).toBe(
      "width=device-width, initial-scale=1, viewport-fit=cover",
    );
  });
});

describe("useElementSize", () => {
  // Renders a real element carrying the ref, and records every size reported.
  function renderProbe() {
    const sizes: ElementSize[] = [];
    function Probe() {
      const [ref, size] = useElementSize<HTMLDivElement>();
      sizes.push(size);
      return createElement("div", { ref });
    }
    const view = render(createElement(Probe));
    return { sizes, view };
  }

  it("reports the size of the element, and only real changes", () => {
    let notify: (width: number, height: number) => void = () => {};
    const observed: Element[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ConstructorParameters<typeof ResizeObserver>[0]) {
          notify = (width, height) =>
            callback(
              [{ contentRect: { width, height } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            );
        }
        observe(element: Element) {
          observed.push(element);
        }
        disconnect = disconnect;
      },
    );
    const { sizes, view } = renderProbe();
    expect(observed).toEqual([view.container.firstElementChild]);
    expect(sizes.at(-1)).toEqual({ width: 0, height: 0 });
    act(() => notify(320, 240));
    expect(sizes.at(-1)).toEqual({ width: 320, height: 240 });
    const reported = sizes.at(-1);
    act(() => notify(320, 240)); // same size: the same object, nothing to redraw
    expect(sizes.at(-1)).toBe(reported);
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("stays at zero without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { sizes } = renderProbe();
    expect(sizes.at(-1)).toEqual({ width: 0, height: 0 });
  });
});
