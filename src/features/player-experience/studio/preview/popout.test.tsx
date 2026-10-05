// "Open in window": the tab opened from the Studio shows the design the Studio holds, live,
// over a BroadcastChannel — not whatever the tab's own storage has (the default design).
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { PopoutFrame } from "../../runtime/host/FrameHost";
import type { PopoutMessage } from "../../runtime/host/popoutChannel";
import { createLocalServices } from "../../services/createLocalServices";
import { createStudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import { CONFIG_DEBOUNCE_MS } from "./usePreviewBridge";
import { usePopoutPublisher } from "./usePopoutPublisher";

// What the frame draws is tested elsewhere: here only what it was given.
vi.mock("../../runtime/host/FrameExperience", () => ({
  FrameExperience: ({
    config,
    locale,
  }: {
    config: { screens: { welcome: { title: Record<string, string> } } };
    locale: string;
  }) => <p>frame:{config.screens.welcome.title[locale]}</p>,
  frameScreen: () => null,
}));

// An in-memory BroadcastChannel: every instance of a name hears the others, never itself.
class FakeChannel {
  static all = new Set<FakeChannel>();
  private listeners = new Set<(event: MessageEvent) => void>();
  constructor(readonly name: string) {
    FakeChannel.all.add(this);
  }
  postMessage(data: unknown) {
    for (const other of FakeChannel.all) {
      if (other !== this && other.name === this.name) {
        other.listeners.forEach((listener) =>
          listener({ data } as MessageEvent),
        );
      }
    }
  }
  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.add(listener);
  }
  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.delete(listener);
  }
  close() {
    FakeChannel.all.delete(this);
  }
}

beforeEach(() => {
  FakeChannel.all.clear();
  vi.stubGlobal("BroadcastChannel", FakeChannel);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function Publisher() {
  usePopoutPublisher();
  return null;
}

function renderStudio(campaignId: string | null = null) {
  const store = createStudioStore({
    config: createDefaultExperience({ gameType: "lucky_wheel" }),
  });
  // A campaign id is part of the Studio's state once it is open on a campaign.
  if (campaignId) store.setState({ campaignId });
  render(
    <StudioProvider value={{ store, services: createLocalServices() }}>
      <Publisher />
    </StudioProvider>,
  );
  return store;
}

// Listens like the tab does, and records what the Studio sends.
function spy() {
  const channel = new FakeChannel("xp-popout");
  const received: PopoutMessage[] = [];
  channel.addEventListener("message", (event) =>
    received.push(event.data as PopoutMessage),
  );
  return {
    received,
    send: (message: PopoutMessage) => channel.postMessage(message),
  };
}

describe("the Studio, for the window it opened", () => {
  it("answers a window asking for the design with the design it holds now", () => {
    const store = renderStudio();
    const tab = spy();
    store
      .getState()
      .updateScreen("welcome", { title: { fr: "Pas encore enregistré" } });

    tab.send({ type: "xp:popout-hello", campaignId: null });
    expect(tab.received).toHaveLength(1);
    expect(tab.received[0]).toMatchObject({
      type: "xp:popout-state",
      campaignId: null,
      locale: "fr",
    });
    const message = tab.received[0];
    expect(
      message.type === "xp:popout-state" &&
        message.config.screens.welcome.title.fr,
    ).toBe("Pas encore enregistré");
  });

  it("sends the design again a moment after every edit", () => {
    vi.useFakeTimers();
    const store = renderStudio();
    const tab = spy();

    act(() => {
      store.getState().updateScreen("welcome", { title: { fr: "Bonjour" } });
      store.getState().updateScreen("welcome", { title: { fr: "Bonjour !" } });
    });
    expect(tab.received).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(CONFIG_DEBOUNCE_MS);
    });
    // The two edits go out as one.
    expect(tab.received).toHaveLength(1);
    const message = tab.received[0];
    expect(
      message.type === "xp:popout-state" &&
        message.config.screens.welcome.title.fr,
    ).toBe("Bonjour !");
  });

  it("plays the demo campaign when none is linked, and ignores another campaign's window", () => {
    const store = renderStudio("c1");
    const tab = spy();
    tab.send({ type: "xp:popout-hello", campaignId: "c2" });
    expect(tab.received).toHaveLength(0);

    tab.send({ type: "xp:popout-hello", campaignId: "c1" });
    const message = tab.received[0];
    expect(
      message.type === "xp:popout-state" && message.campaign.gameType,
    ).toBe(createDemoCampaign(store.getState().config.game.type).gameType);
  });
});

describe("the window opened from the Studio", () => {
  it("asks for the design, waits, then shows the one it is sent", () => {
    const tab = spy();
    render(<PopoutFrame campaignId="c1" />);
    expect(screen.getByText("Waiting for the Studio…")).toBeTruthy();
    // It asked, for its own campaign.
    expect(tab.received).toEqual([
      { type: "xp:popout-hello", campaignId: "c1" },
    ]);

    const config = createDefaultExperience({ gameType: "lucky_wheel" });
    config.screens.welcome.title = { fr: "Le design du Studio" };
    act(() =>
      tab.send({
        type: "xp:popout-state",
        campaignId: "c1",
        config,
        campaign: createDemoCampaign("lucky_wheel"),
        locale: "fr",
      }),
    );
    expect(screen.getByText("frame:Le design du Studio")).toBeTruthy();
    expect(screen.queryByText("Waiting for the Studio…")).toBeNull();
  });

  it("follows the next edits, and ignores another campaign's design", () => {
    const tab = spy();
    render(<PopoutFrame campaignId="c1" />);
    const config = createDefaultExperience({ gameType: "lucky_wheel" });
    const send = (campaignId: string, title: string) => {
      const next = structuredClone(config);
      next.screens.welcome.title = { fr: title };
      act(() =>
        tab.send({
          type: "xp:popout-state",
          campaignId,
          config: next,
          campaign: createDemoCampaign("lucky_wheel"),
          locale: "fr",
        }),
      );
    };
    send("c1", "Premier");
    expect(screen.getByText("frame:Premier")).toBeTruthy();
    send("c2", "D'une autre campagne");
    expect(screen.getByText("frame:Premier")).toBeTruthy();
    send("c1", "Deuxième");
    expect(screen.getByText("frame:Deuxième")).toBeTruthy();
  });

  it("says so when the browser cannot follow the Studio", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    render(<PopoutFrame campaignId={null} />);
    expect(
      screen.getByText("This browser cannot follow the Studio"),
    ).toBeTruthy();
  });
});
