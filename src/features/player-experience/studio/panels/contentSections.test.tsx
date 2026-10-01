import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import type { ToFrameMessage } from "../../runtime/host/previewBridge";
import { createLocalServices } from "../../services/createLocalServices";
import { PreviewViewport } from "../preview/PreviewViewport";
import { CONFIG_DEBOUNCE_MS } from "../preview/usePreviewBridge";
import { createStudioStore, type StudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import { ContentPanel } from "./ContentPanel";
import { MAX_CHIPS, SectionsPanel } from "./SectionsPanel";

function renderPanel(Panel: ComponentType, withPreview = false) {
  const store: StudioStore = createStudioStore({
    config: createDefaultExperience({ gameType: "lucky_wheel" }),
  });
  render(
    <StudioProvider value={{ store, services: createLocalServices() }}>
      <Panel />
      {withPreview && <PreviewViewport restartKey={0} />}
    </StudioProvider>,
  );
  return store;
}

describe("ContentPanel", () => {
  afterEach(() => vi.useRealTimers());

  it("edits the screen shown in the preview, and follows its tab", () => {
    const store = renderPanel(ContentPanel);
    expect(screen.queryByRole("radio", { name: "Win" })).toBeNull();

    act(() => store.getState().setScreen("win"));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Bravo !" },
    });
    expect(store.getState().config.screens.win.title.fr).toBe("Bravo !");

    act(() => store.getState().setScreen("lose"));
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      store.getState().config.screens.lose.title.fr,
    );
    expect(store.getState().config.screens.win.title.fr).toBe("Bravo !");
  });

  it("opens the screen of a text clicked in the preview", () => {
    const store = renderPanel(ContentPanel);
    act(() => store.getState().setPanel("content", "screens.register.title"));
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      store.getState().config.screens.register.title.fr,
    );
  });

  it("sends a text to the preview in the right language, without a reload", async () => {
    vi.useFakeTimers();
    const store = renderPanel(ContentPanel, true);
    const frame = document.querySelector("iframe")!.contentWindow!;
    const posted: ToFrameMessage[] = [];
    vi.spyOn(frame, "postMessage").mockImplementation((message) => {
      posted.push(message as ToFrameMessage);
    });
    act(() =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "xp:ready" },
          origin: window.location.origin,
          source: frame,
        }),
      ),
    );
    posted.length = 0;

    // The Arabic tab of the field switches the preview to Arabic.
    fireEvent.click(screen.getAllByRole("tab", { name: /Arabic/ })[0]);
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "أدر العجلة" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CONFIG_DEBOUNCE_MS);
    });
    const ui = posted.filter((message) => message.type === "xp:ui").at(-1);
    const config = posted
      .filter((message) => message.type === "xp:config")
      .at(-1);
    expect(ui).toMatchObject({ locale: "ar" });
    expect(
      config?.type === "xp:config" && config.config.screens.welcome.title.ar,
    ).toBe("أدر العجلة");
    expect(store.getState().ui.locale).toBe("ar");
  });

  it("turns the second button and the encouragement on and off", () => {
    const store = renderPanel(ContentPanel);
    fireEvent.click(screen.getByRole("switch", { name: /Second button/ }));
    expect(store.getState().config.screens.welcome.secondaryCta).toEqual({});
    fireEvent.change(screen.getByLabelText("Second button text"), {
      target: { value: "Voir le règlement" },
    });
    fireEvent.click(screen.getByRole("switch", { name: /Second button/ }));
    expect(store.getState().config.screens.welcome.secondaryCta).toBeNull();

    fireEvent.change(screen.getByLabelText("Encouragement"), {
      target: { value: "attempts" },
    });
    expect(screen.getByLabelText("Encouragement text")).toBeTruthy();
  });

  it("offers languages, never without the default one", () => {
    const store = renderPanel(ContentPanel);
    act(() => store.getState().setLocale("en"));
    fireEvent.click(screen.getByRole("switch", { name: "English" }));
    expect(store.getState().config.locales.enabled).toEqual(["fr", "ar"]);
    // The preview leaves a language players no longer get.
    expect(store.getState().ui.locale).toBe("fr");
    expect(
      screen.getByRole("switch", { name: "French (default)" }),
    ).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Default language"), {
      target: { value: "ar" },
    });
    expect(store.getState().config.locales.default).toBe("ar");
    fireEvent.click(screen.getByRole("switch", { name: "English" }));
    expect(store.getState().config.locales.enabled).toEqual(["fr", "ar", "en"]);
  });
});

describe("SectionsPanel", () => {
  it("edits and hides the jackpot card", () => {
    const store = renderPanel(SectionsPanel);
    fireEvent.change(screen.getByLabelText("Badge"), {
      target: { value: "Nouveau" },
    });
    expect(store.getState().config.sections.jackpot.badge.fr).toBe("Nouveau");
    fireEvent.click(screen.getByRole("switch", { name: /jackpot card/ }));
    expect(store.getState().config.sections.jackpot.enabled).toBe(false);
    expect(screen.queryByLabelText("Badge")).toBeNull();
  });

  it("keeps between one and four prize chips", () => {
    const store = renderPanel(SectionsPanel);
    const chips = () => store.getState().config.sections.prizeChips.items;
    while (chips().length < MAX_CHIPS) {
      fireEvent.click(screen.getByRole("button", { name: "Add a chip" }));
    }
    expect(
      screen.getByRole("button", { name: `Maximum ${MAX_CHIPS}` }),
    ).toHaveProperty("disabled", true);
    while (chips().length > 1) {
      fireEvent.click(screen.getByRole("button", { name: "Remove Chip 1" }));
    }
    expect(
      screen.getByRole("button", { name: "Remove Chip 1" }),
    ).toHaveProperty("disabled", true);
    const [chip] = chips();
    fireEvent.click(screen.getByRole("radio", { name: "Accent" }));
    expect(chips()[0]).toMatchObject({ id: chip.id, tone: "accent" });
  });
});
