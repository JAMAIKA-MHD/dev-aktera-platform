import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import type { ToFrameMessage } from "../../runtime/host/previewBridge";
import { createLocalServices } from "../../services/createLocalServices";
import { PreviewViewport } from "../preview/PreviewViewport";
import { CONFIG_DEBOUNCE_MS } from "../preview/usePreviewBridge";
import { createStudioStore, type StudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import { SectionsPanel } from "./SectionsPanel";
import { MAX_CHIPS } from "./WelcomeSections";

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

describe("Sections › the texts of a screen", () => {
  afterEach(() => vi.useRealTimers());

  it("edits the screen shown in the preview, and follows its tab", () => {
    const store = renderPanel(SectionsPanel);
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
    const store = renderPanel(SectionsPanel);
    act(() => store.getState().setPanel("sections", "screens.register.title"));
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      store.getState().config.screens.register.title.fr,
    );
  });

  it("sends a text to the preview in the right language, without a reload", async () => {
    vi.useFakeTimers();
    const store = renderPanel(SectionsPanel, true);
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
    const store = renderPanel(SectionsPanel);
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
    const store = renderPanel(SectionsPanel);
    act(() => store.getState().setLocale("en"));
    fireEvent.click(screen.getByRole("button", { name: /Languages/ }));
    fireEvent.click(screen.getByRole("switch", { name: "English" }));
    expect(store.getState().config.locales.enabled).toEqual(["fr", "ar"]);
    // The preview leaves a language players no longer get.
    expect(store.getState().ui.locale).toBe("fr");
    expect(
      screen.getByRole("switch", { name: "French (default)" }),
    ).toHaveProperty("disabled", true);
    fireEvent.click(
      screen.getByRole("button", { name: "Make Arabic the default language" }),
    );
    expect(store.getState().config.locales.default).toBe("ar");
    fireEvent.click(screen.getByRole("switch", { name: "English" }));
    expect(store.getState().config.locales.enabled).toEqual(["fr", "ar", "en"]);
  });

  it("enables a disabled language when it is made the default", () => {
    const store = renderPanel(SectionsPanel);
    fireEvent.click(screen.getByRole("button", { name: /Languages/ }));
    fireEvent.click(screen.getByRole("switch", { name: "English" }));
    expect(store.getState().config.locales.enabled).toEqual(["fr", "ar"]);
    fireEvent.click(
      screen.getByRole("button", { name: "Make English the default language" }),
    );
    expect(store.getState().config.locales.default).toBe("en");
    expect(store.getState().config.locales.enabled).toEqual(["fr", "ar", "en"]);
  });

  it("closes the languages menu on Escape", () => {
    renderPanel(SectionsPanel);
    fireEvent.click(screen.getByRole("button", { name: /Languages/ }));
    expect(screen.getByRole("switch", { name: "English" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("switch", { name: "English" })).toBeNull();
  });
});

describe("Sections › Welcome (jackpot card and prize chips)", () => {
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

describe("Sections › the screen menu", () => {
  const options = () =>
    within(screen.getByLabelText("Screen to edit")).getAllByRole("option");

  it("lists every screen, and edits the one it shows", () => {
    const store = renderPanel(SectionsPanel);
    expect(options().map((option) => option.textContent)).toEqual([
      "Welcome",
      "Register",
      "Play",
      "Win",
      "Lose",
      "Status (already played, closed, error)",
    ]);
    // The menu and the preview's screen tabs change the same thing.
    fireEvent.change(screen.getByLabelText("Screen to edit"), {
      target: { value: "win" },
    });
    expect(store.getState().ui.screen).toBe("win");
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe(
      store.getState().config.screens.win.title.fr,
    );
    act(() => store.getState().setScreen("lose"));
    expect(
      (screen.getByLabelText("Screen to edit") as HTMLSelectElement).value,
    ).toBe("lose");
  });

  it("shows the blocks of a screen on that screen only", () => {
    const store = renderPanel(SectionsPanel);
    const has = (title: string) => screen.queryByText(title) !== null;
    // Welcome: the jackpot card, the prize chips and the teaser.
    expect(has("Jackpot card")).toBe(true);
    expect(has("Prize chips")).toBe(true);
    expect(has("Welcome teaser")).toBe(true);
    expect(has("Fields")).toBe(false);

    act(() => store.getState().setScreen("register"));
    expect(has("Fields")).toBe(true);
    expect(has("Consent")).toBe(true);
    expect(has("Jackpot card")).toBe(false);

    act(() => store.getState().setScreen("play"));
    expect(has("Fields")).toBe(false);
    // Play: the look of the game (the standalone demo is a wheel), never its rules.
    expect(has("Wheel")).toBe(true);

    act(() => store.getState().setScreen("win"));
    expect(has("Texts")).toBe(true);
    expect(has("Wheel")).toBe(false);
  });

  it("keeps the languages menu on every screen", () => {
    const store = renderPanel(SectionsPanel);
    for (const key of ["welcome", "register", "play", "win", "lose"] as const) {
      act(() => store.getState().setScreen(key));
      expect(screen.getByRole("button", { name: /Languages/ })).toBeTruthy();
    }
  });

  it("says the status screens have nothing to edit yet", () => {
    const store = renderPanel(SectionsPanel);
    act(() => store.getState().setScreen("status"));
    expect(screen.getByText(/nothing to edit yet/)).toBeTruthy();
    expect(screen.queryByLabelText("Title")).toBeNull();
  });

  it("opens the screen of a path, whichever the panel showed", () => {
    const store = renderPanel(SectionsPanel);
    act(() => store.getState().setPanel("sections", "form.consent.text"));
    expect(store.getState().ui.screen).toBe("register");
    expect(screen.getByText("Consent")).toBeTruthy();
    act(() => store.getState().setPanel("sections", "game.teaser.caption"));
    expect(store.getState().ui.screen).toBe("welcome");
    act(() => store.getState().setPanel("sections", "sections.jackpot.title"));
    expect(store.getState().ui.screen).toBe("welcome");
    act(() => store.getState().setPanel("sections", "game.wheel.segments"));
    expect(store.getState().ui.screen).toBe("play");
    // A path with no screen of its own keeps the screen.
    act(() => store.getState().setPanel("sections", "locales"));
    expect(store.getState().ui.screen).toBe("play");
  });
});
