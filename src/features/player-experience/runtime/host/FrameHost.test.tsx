import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { createLocalServices } from "../../services/createLocalServices";
import { BridgeFrame, FrameHost, LocalFrame } from "./FrameHost";
import { FIXTURE_NAMES, getFixture, readFixtureLocale } from "./fixtures";
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
  it("offers the control pages of phase 3", () => {
    expect(FIXTURE_NAMES).toEqual([
      "layout-debug",
      "theme-presets",
      "welcome-midnight-gold",
      "frame-long-texts",
      "frame-no-header",
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
    // Built on demand: two reads never share an object.
    expect(getFixture("frame-long-texts")?.config).not.toBe(
      getFixture("frame-long-texts")?.config,
    );
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
        "Available: layout-debug, theme-presets, welcome-midnight-gold, frame-long-texts, frame-no-header",
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
    expect(screen.getByText("Lancer le jeu")).toBeTruthy(); // CTA stand-in
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
    expect(await screen.findByTestId("layout-mode")).toBeTruthy();
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
    const editable = document.createElement("span");
    editable.setAttribute("data-xp-edit", "screens.welcome.title");
    const inner = document.createElement("b");
    editable.appendChild(inner);
    container.querySelector("main")?.appendChild(editable);
    fireEvent.click(inner);
    fireEvent.click(container.querySelector("main") as HTMLElement); // not editable
    expect(posted).toEqual([
      { type: "xp:ready" },
      { type: "xp:edit-target", path: "screens.welcome.title" },
    ]);
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

describe("LocalFrame", () => {
  it("shows the demo configuration when nothing is saved, and follows saves live", async () => {
    const { container } = render(<LocalFrame campaignId={null} />);
    await screen.findByTestId("layout-mode");
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
