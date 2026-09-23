import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { createLocalServices } from "../../services/createLocalServices";
import { BridgeFrame, FrameHost, LocalFrame } from "./FrameHost";
import { disposeConfetti } from "../feedback/confetti";
import { FeedbackDebugView } from "./FeedbackDebugView";
import { frameScreen } from "./FrameExperience";
import { FIXTURE_NAMES, getFixture, readFixtureLocale } from "./fixtures";

const confetti = vi.hoisted(() => {
  const fire = Object.assign(vi.fn(), { reset: vi.fn() });
  return { fire, create: vi.fn(() => fire) };
});
vi.mock("canvas-confetti", () => ({ default: { create: confetti.create } }));
import type { Bridge, FromFrameMessage, ToFrameMessage } from "./previewBridge";

function visit(search: string) {
  window.history.pushState({}, "", `/xp-frame${search}`);
}

// A bridge the test drives: it records what the frame posts and delivers Studio messages.
function fakeBridge() {
  let deliver: (message: ToFrameMessage) => void = () => {};
  const posted: FromFrameMessage[] = [];
  const bridge: Bridge<FromFrameMessage, ToFrameMessage> = {
    post: (message) => posted.push(message),
    subscribe: (listener) => {
      deliver = listener;
      return () => {
        deliver = () => {};
      };
    },
  };
  return {
    bridge,
    posted,
    send: (message: ToFrameMessage) => act(() => deliver(message)),
  };
}

afterEach(() => {
  visit("");
  localStorage.clear();
  document.head
    .querySelectorAll('meta[name="robots"], meta[name="viewport"]')
    .forEach((meta) => meta.remove());
});

describe("fixtures", () => {
  it("offers the control pages of phases 3 and 4", () => {
    expect(FIXTURE_NAMES).toEqual([
      "layout-debug",
      "theme-presets",
      "feedback-debug",
      "welcome-midnight-gold",
      "frame-long-texts",
      "frame-play-hit-it",
      "frame-quiz-progress",
      "frame-cta-loading",
      "frame-cta-disabled",
      "frame-no-header",
      "flow-welcome",
      "flow-gateway-refused",
      "register",
      "register-all-fields",
      "resolving",
      "status-duplicate",
      "status-closed",
      "status-error",
      "wheel-play",
      "wheel-welcome",
      "scratch-play",
      "scratch-welcome",
      "flow-win",
      "flow-lose",
    ]);
    expect(getFixture("layout-debug")?.config.theme.presetId).toBe(
      "midnight-gold",
    );
    const welcome = getFixture("welcome-midnight-gold");
    expect(welcome?.view).toBe("frame");
    expect(welcome?.screen).toBe("welcome");
    expect(welcome?.config.brand.name).toBe("Zeta Market");
    const noHeader = getFixture("frame-no-header");
    expect(noHeader?.screen).toBe("win");
    expect(noHeader?.config.screens.win.showHeader).toBe(false);
    const hitIt = getFixture("frame-play-hit-it");
    expect(hitIt?.config.screens.play.reinforcement.text.fr).toBe(
      "Plus que 10 secondes",
    );
    expect(hitIt?.config.screens.play.secondaryCta?.fr).toBe("Voir les règles");
    // Built on demand: two reads never share an object.
    expect(getFixture("frame-long-texts")?.config).not.toBe(
      getFixture("frame-long-texts")?.config,
    );
    // The tallest registration form: the four fields, all required.
    const tallest = getFixture("register-all-fields");
    expect(tallest?.flow.initialScreen).toBe("register");
    expect(
      tallest?.config.form.fields.every(
        (field) => field.enabled && field.required,
      ),
    ).toBe(true);
    // T4.3: the wait, and the three non-winning statuses, each with a matching scenario.
    expect(getFixture("resolving")?.flow.initialScreen).toBe("resolving");
    expect(getFixture("status-duplicate")?.flow).toMatchObject({
      scenario: "duplicate",
      initialScreen: "duplicate",
    });
    expect(getFixture("status-closed")?.flow).toMatchObject({
      scenario: "closed",
      initialScreen: "closed",
    });
    expect(getFixture("status-error")?.flow).toMatchObject({
      scenario: "network-error",
      initialScreen: "error",
    });
    // T4.4: the two outcomes.
    expect(getFixture("wheel-play")?.flow.initialScreen).toBe("play");
    expect(getFixture("flow-win")?.flow.initialScreen).toBe("win");
    expect(getFixture("flow-lose")?.flow.initialScreen).toBe("lose");
    expect(getFixture("constructor")).toBeNull();
    expect(readFixtureLocale("ar")).toBe("ar");
    expect(readFixtureLocale("en")).toBe("en");
    expect(readFixtureLocale("xx")).toBe("fr");
    expect(readFixtureLocale(null)).toBe("fr");
  });
});

describe("FrameHost", () => {
  it("renders a fixture, marks the page noindex and enables safe areas", () => {
    visit("?fixture=layout-debug");
    const { unmount } = render(<FrameHost />);
    expect(screen.getByTestId("layout-mode").textContent).toMatch(
      /^(stack|split) · /,
    );
    expect(screen.getByText("Demo")).toBeTruthy();
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute("content"),
    ).toBe("noindex");
    expect(
      document.querySelector('meta[name="viewport"]')?.getAttribute("content"),
    ).toContain("viewport-fit=cover");
    expect(document.title).toBe("Player Experience preview");
    unmount();
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("renders the five presets, in the requested language", () => {
    visit("?fixture=theme-presets&locale=ar");
    const { container } = render(<FrameHost />);
    expect(screen.getAllByText("Lancer le jeu")).toHaveLength(5);
    expect(container.querySelector(".xp-runtime")?.getAttribute("dir")).toBe(
      "rtl",
    );
  });

  it("lists the fixtures when the name is unknown", () => {
    visit("?fixture=nope");
    render(<FrameHost />);
    expect(screen.getByText('Unknown fixture "nope"')).toBeTruthy();
    expect(
      screen.getByText(
        "Available: layout-debug, theme-presets, feedback-debug, welcome-midnight-gold, frame-long-texts, frame-play-hit-it, frame-quiz-progress, frame-cta-loading, frame-cta-disabled, frame-no-header, flow-welcome, flow-gateway-refused, register, register-all-fields, resolving, status-duplicate, status-closed, status-error, wheel-play, wheel-welcome, scratch-play, scratch-welcome, flow-win, flow-lose",
      ),
    ).toBeTruthy();
  });

  it("draws the frame fixtures, with the DEMO badge in the header", () => {
    visit("?fixture=welcome-midnight-gold");
    const { container, unmount } = render(<FrameHost />);
    const header = container.querySelector('[data-xp-slot="header"]');
    expect(header?.textContent).toContain("Zeta Market");
    expect(header?.textContent).toContain("Demo");
    expect(screen.getAllByText("Demo")).toHaveLength(1); // no floating badge
    expect(container.querySelector('[data-xp-slot="title"]')?.textContent).toBe(
      "Tournez la roue et tentez votre chance",
    );
    // A real CTA, which does nothing until the flow exists (T4.1).
    fireEvent.click(screen.getByRole("button", { name: "Lancer le jeu" }));
    expect(screen.getByRole("button", { name: "Lancer le jeu" })).toBeTruthy();
    unmount();

    visit("?fixture=frame-long-texts&locale=ar");
    const long = render(<FrameHost />);
    expect(
      long.container
        .querySelector('[data-xp-slot="header"] img')
        ?.getAttribute("src"),
    ).toBe("/aktera-logo.png");
    expect(
      long.container
        .querySelector("[data-xp-hero]")
        ?.getAttribute("data-xp-hero"),
    ).toBe("gift");
    long.unmount();

    visit("?fixture=frame-no-header");
    const noHeader = render(<FrameHost />);
    expect(
      noHeader.container.querySelector('[data-xp-slot="header"]'),
    ).toBeNull();
    expect(
      noHeader.container.querySelector('[data-xp-slot="status"]')?.textContent,
    ).toBe("Demo");
    expect(
      noHeader.container
        .querySelector("[data-xp-hero]")
        ?.getAttribute("data-xp-hero"),
    ).toBe("trophy");
  });

  it("tries every feedback of T3.7 on its control page", async () => {
    visit("?fixture=feedback-debug");
    render(<FrameHost />);
    expect(screen.getByText("Sounds, confetti and hooks")).toBeTruthy();
    const value = (name: string) =>
      screen.getByTestId(`feedback-${name}`).textContent;
    expect(value("sound")).toBe("locked until a gesture");
    expect(value("session")).toMatch(/^sess_/);
    fireEvent.pointerDown(document.body); // the first gesture unlocks the audio
    fireEvent.click(screen.getByRole("button", { name: "win" }));
    expect(value("last")).toBe("win · 0 s");
    fireEvent.click(screen.getByRole("button", { name: "Confetti" }));
    expect(value("last")).toBe("confetti");
    expect(confetti.fire).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Vibrate" }));
    expect(value("last")).toBe("no vibration here");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy session id" }));
    });
    // jsdom has no clipboard: the button says nothing was copied.
    expect(
      screen.getByRole("button", { name: "Copy session id" }),
    ).toBeTruthy();
    disposeConfetti(document);
  });

  it("reports each feedback that worked", async () => {
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function (this: object) {
        Object.assign(this, { state: "running" });
      }),
    );
    Object.defineProperty(navigator, "vibrate", {
      value: vi.fn(() => true),
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });
    const config = createDefaultExperience({ gameType: "lucky_wheel" });
    const { rerender } = render(<FeedbackDebugView config={config} />);
    fireEvent.pointerDown(document.body);
    fireEvent.click(screen.getByRole("button", { name: "click" }));
    expect(screen.getByTestId("feedback-sound").textContent).toBe("unlocked");
    fireEvent.click(screen.getByRole("button", { name: "Vibrate" }));
    expect(screen.getByTestId("feedback-last").textContent).toBe("vibrated");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy session id" }));
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
    config.features.sound = false;
    rerender(<FeedbackDebugView config={{ ...config }} />);
    expect(screen.getByTestId("feedback-sound").textContent).toBe("off");
    Reflect.deleteProperty(navigator, "vibrate");
    Reflect.deleteProperty(navigator, "clipboard");
    vi.unstubAllGlobals();
  });

  it("holds the confetti back with reduced motion", () => {
    confetti.fire.mockClear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    visit("?fixture=feedback-debug");
    render(<FrameHost />);
    expect(screen.getByTestId("feedback-reduced-motion").textContent).toBe(
      "yes",
    );
    fireEvent.click(screen.getByRole("button", { name: "Confetti" }));
    expect(screen.getByTestId("feedback-last").textContent).toBe(
      "confetti skipped (reduced motion)",
    );
    expect(confetti.fire).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("waits for the Studio by default", () => {
    render(<FrameHost />);
    expect(screen.getByText("Waiting for the Studio…")).toBeTruthy();
  });

  it("reads the saved configuration with source=local", async () => {
    const config = createDefaultExperience({
      gameType: "quiz",
      presetId: "clean-light",
    });
    await createLocalServices().repository.save(config);
    visit("?source=local");
    const { container } = render(<FrameHost />);
    expect(await screen.findByText("Commencer le quiz")).toBeTruthy(); // its journey
    expect(screen.getByText("Demo")).toBeTruthy();
    expect(
      container.querySelector(".xp-runtime")?.getAttribute("data-xp-mode"),
    ).toBe("light");
  });
});

describe("BridgeFrame", () => {
  it("says it is ready, then shows the configuration it receives", () => {
    const { bridge, posted, send } = fakeBridge();
    const { container } = render(<BridgeFrame bridge={bridge} />);
    expect(posted).toEqual([{ type: "xp:ready" }]);
    expect(screen.getByText("Waiting for the Studio…")).toBeTruthy();
    send({
      type: "xp:config",
      config: createDefaultExperience({
        gameType: "quiz",
        presetId: "obsidian-violet",
      }),
      campaign: createDemoCampaign("quiz"),
    });
    const root = container.querySelector<HTMLElement>(".xp-runtime");
    expect(root?.style.getPropertyValue("--xp-primary")).toBe("#7C3AED");
    expect(root?.getAttribute("dir")).toBe("ltr");
  });

  it("follows the language and the safe areas of the preview", () => {
    const { bridge, send } = fakeBridge();
    const { container } = render(<BridgeFrame bridge={bridge} />);
    send({
      type: "xp:config",
      config: createDefaultExperience({ gameType: "quiz" }),
      campaign: createDemoCampaign("quiz"),
    });
    send({
      type: "xp:ui",
      screen: "welcome",
      locale: "ar",
      mode: "static",
      safeArea: { top: 47, right: 0, bottom: 34, left: 0 },
      restartKey: 1,
    });
    const root = container.querySelector<HTMLElement>(".xp-runtime");
    expect(root?.getAttribute("dir")).toBe("rtl");
    expect(root?.parentElement?.style.getPropertyValue("--xp-safe-top")).toBe(
      "47px",
    );
  });

  it("tells the Studio which field a click points to", () => {
    const { bridge, posted, send } = fakeBridge();
    const { container } = render(<BridgeFrame bridge={bridge} />);
    send({
      type: "xp:config",
      config: createDefaultExperience({ gameType: "quiz" }),
      campaign: createDemoCampaign("quiz"),
    });
    fireEvent.click(screen.getByText("Relevez le quiz express")); // the title
    fireEvent.click(container.querySelector(".xp-frame") as HTMLElement); // not editable
    expect(
      posted.filter((message) => message.type === "xp:edit-target"),
    ).toEqual([{ type: "xp:edit-target", path: "screens.welcome.title" }]);
  });

  it("plays the journey and tells the Studio each screen shown", () => {
    const { bridge, posted, send } = fakeBridge();
    render(<BridgeFrame bridge={bridge} />);
    send({
      type: "xp:config",
      config: createDefaultExperience({ gameType: "lucky_wheel" }),
      campaign: createDemoCampaign("lucky_wheel"),
    });
    expect(screen.getByText("Demo")).toBeTruthy(); // demo gateway by default
    fireEvent.click(screen.getByText("Lancer le jeu"));
    expect(
      posted.filter((message) => message.type === "xp:flow-event"),
    ).toEqual([
      { type: "xp:flow-event", screen: "welcome" },
      { type: "xp:flow-event", screen: "register" },
    ]);
  });

  it("follows the preview bar: screen, scripted scenario, still screen and restart", () => {
    const { bridge, posted, send } = fakeBridge();
    render(<BridgeFrame bridge={bridge} />);
    send({
      type: "xp:config",
      config: createDefaultExperience({ gameType: "lucky_wheel" }),
      campaign: createDemoCampaign("lucky_wheel"),
    });
    const ui = {
      type: "xp:ui" as const,
      screen: null,
      locale: "fr" as const,
      mode: "demo" as const,
      restartKey: 0,
    };
    // The Status tab shows the screen of the scripted scenario.
    send({ ...ui, mode: "scripted", scenario: "duplicate", screen: "status" });
    expect(screen.getByText("Déjà joué !")).toBeTruthy();
    expect(posted.at(-1)).toEqual({
      type: "xp:flow-event",
      screen: "duplicate",
    });
    // A still screen with no tab chosen: the welcome screen.
    send({ ...ui, mode: "static" });
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
    fireEvent.click(screen.getByText("Lancer le jeu"));
    expect(screen.getByText("Vos coordonnées")).toBeTruthy();
    // A new restartKey starts the journey again.
    send({ ...ui, mode: "static", restartKey: 1 });
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
  });

  it("stops listening when unmounted", () => {
    const subscribe = vi.fn(() => vi.fn());
    const bridge = { post: vi.fn(), subscribe } as unknown as Bridge<
      FromFrameMessage,
      ToFrameMessage
    >;
    const { unmount } = render(<BridgeFrame bridge={bridge} />);
    const unsubscribe = subscribe.mock.results[0].value;
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe("frameScreen", () => {
  it("maps the Studio's tabs to the screens of the journey", () => {
    expect(frameScreen(null)).toBeUndefined();
    expect(frameScreen("win")).toBe("win");
    expect(frameScreen("status", "duplicate")).toBe("duplicate");
    expect(frameScreen("status", "closed")).toBe("closed");
    expect(frameScreen("status", "network-error")).toBe("error");
    expect(frameScreen("status")).toBe("error");
  });
});

describe("journey fixtures", () => {
  it("plays the journey from its start", () => {
    visit("?fixture=flow-welcome&locale=ar");
    const { container } = render(<FrameHost />);
    expect(screen.getByText("ابدأ اللعب")).toBeTruthy();
    expect(container.querySelector(".xp-runtime")?.getAttribute("dir")).toBe(
      "rtl",
    );
    fireEvent.click(screen.getByText("ابدأ اللعب"));
    expect(screen.getByText("بياناتك")).toBeTruthy();
  });

  it("shows the refusal screen of a page that only accepts the live gateway", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    visit("?fixture=flow-gateway-refused");
    render(<FrameHost />);
    expect(screen.getByText("Jeu indisponible")).toBeTruthy();
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});

describe("LocalFrame", () => {
  it("shows the demo configuration when nothing is saved, and follows saves live", async () => {
    const { container } = render(<LocalFrame campaignId={null} />);
    await screen.findByText("Lancer le jeu"); // the demo journey
    const root = () => container.querySelector(".xp-runtime") as HTMLElement;
    expect(root().style.getPropertyValue("--xp-primary")).toBe("#F5BA41");
    await createLocalServices().repository.save(
      createDefaultExperience({ gameType: "quiz", presetId: "retail-blue" }),
    );
    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "xp:experience:v1:standalone" }),
      );
    });
    expect(root().style.getPropertyValue("--xp-primary")).toBe("#2563EB");
    // Other keys are ignored.
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    });
    expect(root().style.getPropertyValue("--xp-primary")).toBe("#2563EB");
  });

  it("ignores a load that finishes after it was closed", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<LocalFrame campaignId={null} />);
    unmount();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
