// The preview bar: language, screen tabs and device controls in ONE bar, which folds into a
// one-line summary to give the preview its height back. Open by default, folded by default on a
// short screen, and the brand's choice is remembered.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalServices } from "../../services/createLocalServices";
import { PreviewPane } from "../layout/PreviewPane";
import { createStudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import {
  loadPreviewBarOpen,
  PREVIEW_BAR_KEY,
  savePreviewBarOpen,
} from "./previewBarPrefs";
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

const toggle = () => screen.getByRole("button", { name: "Preview controls" });
const controls = () => document.getElementById("studio-preview-controls");
const zoomSelect = () => screen.queryByLabelText("Zoom");
const tabs = () => screen.queryByRole("tablist", { name: "Screen" });
const languages = () => screen.queryByRole("radiogroup", { name: "Language" });

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("one bar for language, screens and device", () => {
  it("holds the language, the screen tabs and the device controls together", () => {
    renderPane();
    const bar = controls()!;
    expect(bar).not.toBeNull();
    expect(
      within(bar).getByRole("radiogroup", { name: "Language" }),
    ).toBeTruthy();
    expect(within(bar).getByRole("tablist", { name: "Screen" })).toBeTruthy();
    expect(within(bar).getByLabelText("Zoom")).toBeTruthy();
    expect(
      within(bar).getByRole("button", { name: /One column/ }),
    ).toBeTruthy();
    // There is only one bar above the preview: nothing of the three lives outside it.
    expect(toggle().getAttribute("aria-controls")).toBe(
      "studio-preview-controls",
    );
  });

  it("folds all of it, and opens all of it again, with one button", () => {
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(controls()).toBeNull();
    expect(languages()).toBeNull();
    expect(tabs()).toBeNull();
    expect(zoomSelect()).toBeNull();
    expect(screen.queryByRole("button", { name: /One column/ })).toBeNull();

    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(languages()).not.toBeNull();
    expect(tabs()).not.toBeNull();
    expect(zoomSelect()).not.toBeNull();
  });

  it("has no Restart button: the bar holds the summary and, open, the controls", () => {
    renderPane();
    expect(screen.queryByRole("button", { name: "Restart" })).toBeNull();
    fireEvent.click(toggle());
    expect(screen.queryByRole("button", { name: "Restart" })).toBeNull();
    // Folded, the only button of the summary line is the one that opens the bar.
    expect(controls()).toBeNull();
    expect(toggle().parentElement!.querySelectorAll("button")).toHaveLength(1);
  });
});

describe("the summary", () => {
  it("tells the screen, the language, the size, the tier, the zoom and the device", () => {
    renderPane();
    fireEvent.click(toggle());
    const text = toggle().textContent;
    expect(text).toContain("Welcome");
    expect(text).toContain("fr");
    expect(text).toContain("390 × 844");
    expect(text).toContain("One column");
    expect(text).toContain("100 %");
    expect(text).toContain("iPhone 12–14");
    // The status line under the preview is gone: the summary says it all.
    expect(document.querySelector("p[aria-live]")).toBeNull();
  });

  it("follows the screen, the language, the device and the zoom the brand picks", () => {
    const store = renderPane();
    fireEvent.click(screen.getByRole("tab", { name: "Register" }));
    fireEvent.click(screen.getByRole("radio", { name: "ar" }));
    fireEvent.change(screen.getByLabelText("Zoom"), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Two panes/ }));
    // Folded, it is all still there to read.
    fireEvent.click(toggle());
    const text = toggle().textContent;
    expect(text).toContain("Register");
    expect(text).toContain("ar");
    expect(text).toContain("50 %");
    expect(text).toContain("1280 × 800");
    expect(text).toContain("Two panes");
    expect(text).toContain("Responsive");
    // The Sections panel picks the same screen: the summary follows that too.
    act(() => store.getState().setScreen("win"));
    expect(toggle().textContent).toContain("Win");
  });

  it("is described by the summary, so the button keeps one stable name", () => {
    renderPane();
    const describedBy = toggle().getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)!.textContent).toContain(
      "390 × 844",
    );
    // Not named after what it shows: "Compact", "Win"... stay the buttons of the bar.
    fireEvent.click(screen.getByRole("button", { name: /Compact/ }));
    expect(screen.getAllByRole("button", { name: /Compact/ })).toHaveLength(1);
    expect(screen.getAllByRole("tab", { name: "Win" })).toHaveLength(1);
  });
});

describe("remembering the choice", () => {
  it("is open by default, and remembers what the brand chose, without touching the device", () => {
    const store = renderPane();
    fireEvent.click(toggle());
    expect(localStorage.getItem(PREVIEW_BAR_KEY)).toBe("closed");
    fireEvent.click(toggle());
    expect(localStorage.getItem(PREVIEW_BAR_KEY)).toBe("open");
    // Folding is not an edit: the viewport is the same.
    expect(store.getState().ui.viewport).toMatchObject({
      width: 390,
      height: 844,
    });
  });

  it("starts folded when the brand left it folded", () => {
    localStorage.setItem(PREVIEW_BAR_KEY, "closed");
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(tabs()).toBeNull();
  });

  it("ignores the choice made when the bar held the device controls only", () => {
    // The old key: someone who folded the device bar did not fold the tabs and the languages.
    localStorage.setItem("xp:studio:device-bar:v1", "closed");
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(tabs()).not.toBeNull();
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
    expect(controls()).toBeNull();
    // The summary is enough to know what is shown, and the Sections menu still changes screen.
    expect(toggle().textContent).toContain("Welcome");
    expect(toggle().textContent).toContain("390 × 844");
  });

  it("starts open on a tall screen", () => {
    stubScreen(false);
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("lets the brand's own choice win over the screen", () => {
    stubScreen(true);
    localStorage.setItem(PREVIEW_BAR_KEY, "open");
    renderPane();
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });
});

describe("previewBarPrefs", () => {
  it("falls back to the screen's default when storage is blocked or says nothing useful", () => {
    const blocked = () => {
      throw new Error("blocked");
    };
    expect(loadPreviewBarOpen(blocked)).toBe(true);
    stubScreen(true);
    expect(loadPreviewBarOpen(blocked)).toBe(false);
    localStorage.setItem(PREVIEW_BAR_KEY, "banana");
    expect(loadPreviewBarOpen()).toBe(false);
    // Saving into blocked storage never throws.
    expect(() => savePreviewBarOpen(true, blocked)).not.toThrow();
  });
});
