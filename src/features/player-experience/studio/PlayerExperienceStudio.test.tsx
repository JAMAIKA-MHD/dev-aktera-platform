import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoCampaign } from "../presets/demoCampaign";
import { createLocalServices } from "../services/createLocalServices";
import type { ToFrameMessage } from "../runtime/host/previewBridge";
import { PlayerExperienceStudio } from "./PlayerExperienceStudio";
import { PreviewViewport } from "./preview/PreviewViewport";
import { CONFIG_DEBOUNCE_MS } from "./preview/usePreviewBridge";
import { createStudioStore } from "./store";
import { StudioProvider } from "./StudioContext";
import { useUndoShortcuts } from "./useUndoShortcuts";

// The Studio shell and its live preview (T6.2). jsdom does not load the iframe: the tests
// play the frame's part, by posting from its window as the real /xp-frame does.

function frameWindow(): Window {
  const iframe = document.querySelector("iframe");
  if (!iframe?.contentWindow) throw new Error("no preview iframe");
  return iframe.contentWindow;
}

function fromFrame(data: unknown) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data,
      origin: window.location.origin,
      source: frameWindow(),
    }),
  );
}

async function renderStudio() {
  const services = createLocalServices();
  const view = render(<PlayerExperienceStudio services={services} />);
  // The stored configuration is read first (nothing stored here).
  await act(async () => {
    await Promise.resolve();
  });
  const posted: ToFrameMessage[] = [];
  vi.spyOn(frameWindow(), "postMessage").mockImplementation((message) => {
    posted.push(message as ToFrameMessage);
  });
  return { ...view, posted };
}

describe("PlayerExperienceStudio", () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom has no matchMedia: the Studio then assumes a wide screen.
  });
  afterEach(() => vi.useRealTimers());

  it("shows the top bar, the sections and the device-sized preview", async () => {
    await renderStudio();
    expect(screen.getByText("Standalone (demo campaign)")).toBeTruthy();
    for (const label of ["Template", "Brand", "Sections", "Legal", "Export"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(label) }),
      ).toBeTruthy();
    }
    const iframe = document.querySelector("iframe")!;
    // The exact CSS size of the device, whatever the zoom shown.
    expect(iframe.getAttribute("width")).toBe("390");
    expect(iframe.getAttribute("height")).toBe("844");
    expect(iframe.getAttribute("src")).toBe("/xp-frame?source=bridge");
    expect(screen.getByRole("button", { name: "Undo" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("sends nothing before the frame is ready, then the configuration and the view", async () => {
    const { posted } = await renderStudio();
    expect(posted).toEqual([]);
    act(() => fromFrame({ type: "xp:ready" }));
    expect(posted.map((message) => message.type)).toEqual([
      "xp:config",
      "xp:ui",
    ]);
    const config = posted[0] as Extract<ToFrameMessage, { type: "xp:config" }>;
    // Standalone: the frame plays the demo campaign of the configured game.
    expect(config.campaign).toEqual(createDemoCampaign("lucky_wheel"));
    const ui = posted[1] as Extract<ToFrameMessage, { type: "xp:ui" }>;
    // The preview is a still picture: the journey plays in "Open in window".
    expect(ui).toMatchObject({
      screen: "welcome",
      locale: "fr",
      mode: "static",
    });
    // The iPhone's notch and home indicator become the runtime's safe areas.
    expect(ui.safeArea).toEqual({ top: 47, right: 0, bottom: 34, left: 0 });
  });

  it('calls the live window "Preview" and draws an eye on it', async () => {
    await renderStudio();
    const button = screen.getByRole("button", { name: "Preview" });
    expect(button.querySelector("svg")).not.toBeNull();
    expect(screen.queryByText("Open in window")).toBeNull();
    // It opens the tab that follows the Studio (the journey plays there).
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    fireEvent.click(button);
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toMatch(/^\/xp-frame\?source=popout/);
    open.mockRestore();
  });

  it("switches screen, language and status message without losing the configuration", async () => {
    const { posted } = await renderStudio();
    act(() => fromFrame({ type: "xp:ready" }));
    posted.length = 0;

    // No choice of how the journey plays: the preview does not play it.
    expect(screen.queryByLabelText("Scenario")).toBeNull();
    expect(screen.queryByLabelText("Outcome")).toBeNull();
    expect(screen.queryByLabelText("Message")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Win" }));
    fireEvent.click(screen.getByRole("radio", { name: "ar" }));
    fireEvent.click(screen.getByRole("tab", { name: "Status" }));
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "closed" },
    });
    const views = posted.filter(
      (message): message is Extract<ToFrameMessage, { type: "xp:ui" }> =>
        message.type === "xp:ui",
    );
    const last = views[views.length - 1];
    expect(last).toMatchObject({
      screen: "status",
      locale: "ar",
      mode: "static",
      scenario: "closed",
    });
    // Each change of screen or message draws the screen again.
    expect(last.restartKey).toBeGreaterThan(0);
    // The preview is not an edit: no configuration was sent, nothing to undo.
    expect(posted.some((message) => message.type === "xp:config")).toBe(false);
    expect(screen.getByRole("button", { name: "Undo" })).toHaveProperty(
      "disabled",
      true,
    );
    // The Status tab offers the messages of a player who cannot play.
    expect(
      within(screen.getByLabelText("Message"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Already played", "Campaign closed", "Network error"]);
  });

  it("opens the panel of what is clicked in the preview", async () => {
    await renderStudio();
    act(() => fromFrame({ type: "xp:ready" }));
    act(() =>
      fromFrame({ type: "xp:edit-target", path: "screens.welcome.title" }),
    );
    expect(
      screen
        .getByRole("button", { name: /Sections/ })
        .getAttribute("aria-current"),
    ).toBe("page");
    // A click on the consent opens the screen that holds it, in the same panel.
    act(() => fromFrame({ type: "xp:edit-target", path: "form.consent" }));
    expect(
      screen
        .getByRole("button", { name: /Sections/ })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      (screen.getByLabelText("Screen to edit") as HTMLSelectElement).value,
    ).toBe("register");
  });

  it("ignores messages from any other window", async () => {
    await renderStudio();
    act(() => fromFrame({ type: "xp:ready" }));
    act(() =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "xp:edit-target", path: "legal" },
          origin: window.location.origin,
          source: window,
        }),
      ),
    );
    expect(
      screen
        .getByRole("button", { name: /Legal/ })
        .getAttribute("aria-current"),
    ).toBeNull();
  });
});

describe("preview bridge and undo shortcuts", () => {
  afterEach(() => vi.useRealTimers());

  function Harness() {
    useUndoShortcuts();
    return <PreviewViewport restartKey={0} />;
  }

  function renderHarness() {
    const store = createStudioStore();
    render(
      <StudioProvider value={{ store, services: createLocalServices() }}>
        <Harness />
      </StudioProvider>,
    );
    const posted: ToFrameMessage[] = [];
    vi.spyOn(frameWindow(), "postMessage").mockImplementation((message) => {
      posted.push(message as ToFrameMessage);
    });
    act(() => fromFrame({ type: "xp:ready" }));
    posted.length = 0;
    return { store, posted };
  }

  it("sends a burst of edits once, a moment after the last one", async () => {
    vi.useFakeTimers();
    const { store, posted } = renderHarness();
    act(() => {
      store.getState().updateBrand({ name: "Z" });
      store.getState().updateBrand({ name: "Ze" });
      store.getState().updateBrand({ name: "Zeta" });
    });
    expect(posted).toEqual([]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CONFIG_DEBOUNCE_MS);
    });
    expect(posted).toHaveLength(1);
    const [message] = posted as Extract<
      ToFrameMessage,
      { type: "xp:config" }
    >[];
    expect(message.config.brand.name).toBe("Zeta");
  });

  it("brings the live layout audit into the store", () => {
    const { store } = renderHarness();
    const issue = {
      kind: "text-clipped" as const,
      selector: "h1",
      editPath: "screens.welcome.title",
      detail: "clipped by 12 px",
    };
    act(() =>
      fromFrame({
        type: "xp:layout-report",
        width: 390,
        height: 844,
        mode: {
          arrangement: "stack",
          density: "regular",
          compact: false,
          wide: false,
        },
        issues: [issue],
      }),
    );
    expect(store.getState().layoutIssues).toEqual([issue]);
  });

  it("undoes with Ctrl+Z and redoes with Ctrl+Shift+Z, but not while typing", () => {
    const { store } = renderHarness();
    act(() => store.getState().updateBrand({ name: "Zeta" }));
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(store.getState().config.brand.name).toBe("Zeta");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(store.getState().config.brand.name).toBe("");
    fireEvent.keyDown(window, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(store.getState().config.brand.name).toBe("Zeta");
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(store.getState().config.brand.name).toBe("");
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(store.getState().config.brand.name).toBe("Zeta");
    input.remove();
  });
});
