import { describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createDemoCampaign } from "../../presets/demoCampaign";
import {
  createFrameBridge,
  createStudioBridge,
  type ToFrameMessage,
} from "./previewBridge";

const ORIGIN = "http://localhost:3000";

// A window that records its listeners and lets the test deliver message events.
function fakeWindow(parent?: Window) {
  const listeners = new Set<(event: MessageEvent) => void>();
  const win = {
    location: { origin: ORIGIN },
    postMessage: vi.fn(),
    addEventListener: (_: string, listener: (event: MessageEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: (event: MessageEvent) => void) =>
      listeners.delete(listener),
  } as unknown as Window & { postMessage: ReturnType<typeof vi.fn> };
  Object.assign(win, { parent: parent ?? win });
  const deliver = (data: unknown, origin: string, source: unknown) =>
    listeners.forEach((listener) =>
      listener({ data, origin, source } as MessageEvent),
    );
  return { win, deliver, listeners };
}

const config: ToFrameMessage = {
  type: "xp:config",
  config: createDefaultExperience({ gameType: "quiz" }),
  campaign: createDemoCampaign("quiz"),
};

describe("frame bridge (inside /xp-frame)", () => {
  it("receives the Studio's messages from its parent, on our origin", () => {
    const studio = fakeWindow();
    const frame = fakeWindow(studio.win);
    const listener = vi.fn();
    createFrameBridge(frame.win).subscribe(listener);
    frame.deliver(config, ORIGIN, studio.win);
    expect(listener).toHaveBeenCalledWith(config);
  });

  it("ignores another origin, another window and unknown messages", () => {
    const studio = fakeWindow();
    const frame = fakeWindow(studio.win);
    const stranger = fakeWindow();
    const listener = vi.fn();
    createFrameBridge(frame.win).subscribe(listener);
    frame.deliver(config, "https://evil.example.com", studio.win); // other origin
    frame.deliver(config, ORIGIN, stranger.win); // other window
    frame.deliver({ type: "xp:ready" }, ORIGIN, studio.win); // wrong direction
    frame.deliver({ type: "other" }, ORIGIN, studio.win);
    frame.deliver("xp:config", ORIGIN, studio.win);
    frame.deliver(null, ORIGIN, studio.win);
    frame.deliver({ type: 42 }, ORIGIN, studio.win);
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops listening when unsubscribed", () => {
    const studio = fakeWindow();
    const frame = fakeWindow(studio.win);
    const listener = vi.fn();
    const unsubscribe = createFrameBridge(frame.win).subscribe(listener);
    unsubscribe();
    frame.deliver(config, ORIGIN, studio.win);
    expect(listener).not.toHaveBeenCalled();
    expect(frame.listeners.size).toBe(0);
  });

  it("posts to its parent, for our origin only", () => {
    const studio = fakeWindow();
    const frame = fakeWindow(studio.win);
    createFrameBridge(frame.win).post({ type: "xp:ready" });
    expect(studio.win.postMessage).toHaveBeenCalledWith(
      { type: "xp:ready" },
      ORIGIN,
    );
  });

  it("posts nothing when opened in its own tab", () => {
    const alone = fakeWindow();
    createFrameBridge(alone.win).post({ type: "xp:ready" });
    expect(alone.win.postMessage).not.toHaveBeenCalled();
  });
});

describe("Studio bridge", () => {
  function setup() {
    const frameWindow = fakeWindow();
    const studio = fakeWindow();
    const iframe = {
      contentWindow: frameWindow.win,
    } as unknown as HTMLIFrameElement;
    return { frameWindow, studio, iframe };
  }

  it("posts to the iframe, for our origin only", () => {
    const { frameWindow, studio, iframe } = setup();
    createStudioBridge(iframe, studio.win).post(config);
    expect(frameWindow.win.postMessage).toHaveBeenCalledWith(config, ORIGIN);
  });

  it("receives the frame's messages from the iframe only", () => {
    const { frameWindow, studio, iframe } = setup();
    const listener = vi.fn();
    createStudioBridge(iframe, studio.win).subscribe(listener);
    studio.deliver(
      { type: "xp:edit-target", path: "screens.welcome.title" },
      ORIGIN,
      frameWindow.win,
    );
    studio.deliver({ type: "xp:ready" }, ORIGIN, fakeWindow().win); // another iframe
    studio.deliver(
      { type: "xp:ready" },
      "https://evil.example.com",
      frameWindow.win,
    );
    studio.deliver(config, ORIGIN, frameWindow.win); // wrong direction
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      type: "xp:edit-target",
      path: "screens.welcome.title",
    });
  });

  it("receives the live layout report of the frame (T3.8)", () => {
    const { frameWindow, studio, iframe } = setup();
    const listener = vi.fn();
    createStudioBridge(iframe, studio.win).subscribe(listener);
    const report = {
      type: "xp:layout-report",
      width: 360,
      height: 640,
      mode: {
        arrangement: "stack",
        density: "regular",
        compact: false,
        wide: false,
      },
      issues: [],
    };
    studio.deliver(report, ORIGIN, frameWindow.win);
    studio.deliver(report, "https://evil.example.com", frameWindow.win);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(report);
  });

  it("does nothing while the iframe has no window yet", () => {
    const studio = fakeWindow();
    const iframe = { contentWindow: null } as unknown as HTMLIFrameElement;
    const bridge = createStudioBridge(iframe, studio.win);
    expect(() => bridge.post(config)).not.toThrow();
    const listener = vi.fn();
    bridge.subscribe(listener);
    studio.deliver({ type: "xp:ready" }, ORIGIN, null);
    expect(listener).not.toHaveBeenCalled();
  });

  it("uses the current window by default", () => {
    const frameWindow = fakeWindow();
    const iframe = {
      contentWindow: frameWindow.win,
    } as unknown as HTMLIFrameElement;
    createStudioBridge(iframe).post(config);
    expect(frameWindow.win.postMessage).toHaveBeenCalledWith(
      config,
      window.location.origin,
    );
  });
});
