// The device bar folds into a one-line summary, to give the preview its height back. Open by
// default, folded by default on a short screen, and the brand's choice is remembered.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalServices } from "../../services/createLocalServices";
import { PreviewPane } from "../layout/PreviewPane";
import { createStudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import {
  DEVICE_BAR_KEY,
  loadDeviceBarOpen,
  saveDeviceBarOpen,
} from "./deviceBarPrefs";
import { isShortScreen, SHORT_SCREEN_QUERY } from "./shortScreen";

function renderPane() {
  const store = createStudioStore();
  render(
    <StudioProvider value={{ store, services: createLocalServices() }}>
      <PreviewPane />
    </StudioProvider>,
  );
  return store;
}

// A browser whose screen is short (or not): what matchMedia answers for the short query.
function stubScreen(short: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === SHORT_SCREEN_QUERY ? short : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const toggle = () => screen.getByRole("button", { name: "Device bar" });
const zoomSelect = () => screen.queryByLabelText("Zoom");

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("the summary of the device bar", () => {
  it("tells the device, its size, the layout tier and the zoom, even when the bar is folded", () => {
    renderPane();
    fireEvent.click(toggle());
    expect(zoomSelect()).toBeNull();
    const summary = toggle();
    expect(summary.textContent).toContain("390 × 844");
    expect(summary.textContent).toContain("One column");
    expect(summary.textContent).toContain("100 %");
    expect(summary.textContent).toContain("iPhone 12–14");
    // There is no separate status line under the preview any more.
    expect(document.querySelector("[aria-live] + p, p[aria-live]")).toBeNull();
  });

  it("follows the device and the zoom the brand picks", () => {
    renderPane();
    fireEvent.change(screen.getByLabelText("Zoom"), {
      target: { value: "0.5" },
    });
    expect(toggle().textContent).toContain("50 %");
    fireEvent.click(screen.getByRole("button", { name: /Two panes/ }));
    expect(toggle().textContent).toContain("1280 × 800");
    expect(toggle().textContent).toContain("Two panes");
    expect(toggle().textContent).toContain("Responsive");
  });

  it("is described by the summary, so the button keeps one stable name", () => {
    renderPane();
    const describedBy = toggle().getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)!.textContent).toContain(
      "390 × 844",
    );
    // Not named after the tier: "Compact" and the other tiers stay the ruler's buttons.
    fireEvent.click(screen.getByRole("button", { name: /Compact/ }));
    expect(screen.getAllByRole("button", { name: /Compact/ })).toHaveLength(1);
  });
});

describe("folding the device bar", () => {
  it("is open by default, and folds and opens again with its button", () => {
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    const bar = document.getElementById(
      toggle().getAttribute("aria-controls")!,
    )!;
    expect(within(bar).getByLabelText("Zoom")).toBeTruthy();
    expect(
      within(bar).getByRole("button", { name: /One column/ }),
    ).toBeTruthy();

    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(zoomSelect()).toBeNull();
    expect(screen.queryByRole("button", { name: /One column/ })).toBeNull();
    expect(document.getElementById("studio-device-bar")).toBeNull();

    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(zoomSelect()).not.toBeNull();
  });

  it("remembers the choice, and does not touch the device it shows", () => {
    const store = renderPane();
    fireEvent.click(toggle());
    expect(localStorage.getItem(DEVICE_BAR_KEY)).toBe("closed");
    fireEvent.click(toggle());
    expect(localStorage.getItem(DEVICE_BAR_KEY)).toBe("open");
    // Folding is not an edit: the viewport is the same.
    expect(store.getState().ui.viewport).toMatchObject({
      width: 390,
      height: 844,
    });
  });

  it("starts folded when the brand left it folded", () => {
    localStorage.setItem(DEVICE_BAR_KEY, "closed");
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(zoomSelect()).toBeNull();
  });
});

describe("the short screen", () => {
  it("knows a short screen from the browser", () => {
    expect(isShortScreen()).toBe(false); // no matchMedia in this test browser
    stubScreen(true);
    expect(isShortScreen()).toBe(true);
    stubScreen(false);
    expect(isShortScreen()).toBe(false);
  });

  it("starts folded on a short screen, so the preview has the room", () => {
    stubScreen(true);
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(zoomSelect()).toBeNull();
    // The summary is all there is, and it is enough to know what is shown.
    expect(toggle().textContent).toContain("390 × 844");
  });

  it("starts open on a tall screen", () => {
    stubScreen(false);
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("lets the brand's own choice win over the screen, both ways", () => {
    stubScreen(true);
    localStorage.setItem(DEVICE_BAR_KEY, "open");
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });
});

describe("deviceBarPrefs", () => {
  it("falls back to the screen's default when storage is blocked or says nothing useful", () => {
    const blocked = () => {
      throw new Error("blocked");
    };
    expect(loadDeviceBarOpen(blocked)).toBe(true);
    stubScreen(true);
    expect(loadDeviceBarOpen(blocked)).toBe(false);
    localStorage.setItem(DEVICE_BAR_KEY, "banana");
    expect(loadDeviceBarOpen()).toBe(false);
    // Saving into blocked storage never throws.
    expect(() => saveDeviceBarOpen(true, blocked)).not.toThrow();
  });
});
