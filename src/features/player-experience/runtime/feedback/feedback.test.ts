import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudioFeedback, unlockOnFirstGesture } from "./audio";
import { celebrate, disposeConfetti } from "./confetti";
import { vibrate } from "./haptics";

const confetti = vi.hoisted(() => {
  const fire = Object.assign(vi.fn(), { reset: vi.fn() });
  return { fire, create: vi.fn(() => fire) };
});
vi.mock("canvas-confetti", () => ({ default: { create: confetti.create } }));

// A Web Audio context that records what the sounds build.
function fakeContext(state: AudioContext["state"] = "running") {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const oscillators: { type: string; frequency: ReturnType<typeof param> }[] =
    [];
  const sources: unknown[] = [];
  const context = {
    state,
    currentTime: 1,
    sampleRate: 1000,
    destination: {},
    resume: vi.fn(() => Promise.reject(new Error("not allowed"))),
    createOscillator: vi.fn(() => {
      const oscillator = {
        type: "",
        frequency: param(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(oscillator);
      return oscillator;
    }),
    createGain: vi.fn(() => ({ gain: param(), connect: vi.fn() })),
    createBuffer: vi.fn((_channels: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    })),
    createBufferSource: vi.fn(() => {
      const source = { buffer: null, connect: vi.fn(), start: vi.fn() };
      sources.push(source);
      return source;
    }),
    createBiquadFilter: vi.fn(() => ({
      type: "",
      frequency: { value: 0 },
      Q: { value: 0 },
      connect: vi.fn(),
    })),
  };
  return {
    context: context as unknown as AudioContext,
    raw: context,
    oscillators,
    sources,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  disposeConfetti(document);
  document.body.innerHTML = "";
});

describe("audio", () => {
  it("makes no sound, and creates no audio context, before a gesture", () => {
    const create = vi.fn(() => fakeContext().context);
    const audio = createAudioFeedback(create);
    audio.play("win");
    expect(create).not.toHaveBeenCalled();
    expect(audio.unlocked).toBe(false);
  });

  it("unlocks on the first gesture of the document only", () => {
    const { context } = fakeContext();
    const create = vi.fn(() => context);
    const audio = createAudioFeedback(create);
    unlockOnFirstGesture(document, audio);
    fireEvent.pointerDown(document.body);
    expect(create).toHaveBeenCalledOnce();
    expect(audio.unlocked).toBe(true);
    // Then it stops listening: later gestures cost nothing.
    const later = { ...audio, unlock: vi.fn() };
    unlockOnFirstGesture(document, later);
    fireEvent.keyDown(document.body, { key: "Enter" });
    fireEvent.pointerDown(document.body);
    expect(later.unlock).toHaveBeenCalledOnce();
  });

  it("stops listening when the runtime leaves, before any gesture", () => {
    const create = vi.fn(() => fakeContext().context);
    const stop = unlockOnFirstGesture(document, createAudioFeedback(create));
    stop();
    fireEvent.touchEnd(document.body);
    expect(create).not.toHaveBeenCalled();
  });

  it("plays each sound of the prototype", () => {
    const { context, oscillators, sources } = fakeContext();
    const audio = createAudioFeedback(() => context);
    audio.unlock();
    audio.play("win");
    // C5 E5 G5 C6, the last one brighter.
    expect(oscillators.map((oscillator) => oscillator.type)).toEqual([
      "sine",
      "sine",
      "sine",
      "triangle",
    ]);
    expect(
      oscillators.map(
        (oscillator) => oscillator.frequency.setValueAtTime.mock.calls[0][0],
      ),
    ).toEqual([523.25, 659.25, 783.99, 1046.5]);
    oscillators.length = 0;
    audio.play("lose");
    expect(oscillators).toHaveLength(3);
    oscillators.length = 0;
    audio.play("click");
    // A short glide down, from 420 to 160 Hz.
    expect(
      oscillators[0].frequency.exponentialRampToValueAtTime.mock.calls[0][0],
    ).toBe(160);
    audio.play("tick");
    audio.play("countdown");
    expect(oscillators).toHaveLength(3);
    audio.play("scratch");
    expect(sources).toHaveLength(1); // filtered noise, no oscillator
  });

  it("resumes a context that starts suspended, and ignores a refusal", async () => {
    const { context, raw } = fakeContext("suspended");
    const audio = createAudioFeedback(() => context);
    audio.unlock();
    expect(raw.resume).toHaveBeenCalledOnce();
    await Promise.resolve(); // the rejected resume() is caught, not thrown
  });

  it("stays silent while features.sound is off", () => {
    const { context, oscillators } = fakeContext();
    const audio = createAudioFeedback(() => context);
    audio.unlock();
    audio.setEnabled(false);
    audio.play("win");
    expect(oscillators).toHaveLength(0);
    audio.setEnabled(true);
    audio.play("click");
    expect(oscillators).toHaveLength(1);
  });

  it("never throws, whatever the browser refuses", () => {
    const refused = createAudioFeedback(() => {
      throw new Error("no audio");
    });
    expect(() => refused.unlock()).not.toThrow();
    expect(refused.unlocked).toBe(false);

    const { context, raw } = fakeContext();
    raw.createOscillator.mockImplementation(() => {
      throw new Error("busy");
    });
    const broken = createAudioFeedback(() => context);
    broken.unlock();
    expect(() => broken.play("win")).not.toThrow();

    vi.stubGlobal("AudioContext", undefined);
    const none = createAudioFeedback();
    none.unlock();
    expect(none.unlocked).toBe(false); // no Web Audio at all
  });

  it("uses the browser's audio context by default", () => {
    const Context = vi.fn(function (this: object) {
      Object.assign(this, { state: "running" });
    });
    vi.stubGlobal("AudioContext", Context);
    const audio = createAudioFeedback();
    audio.unlock();
    expect(Context).toHaveBeenCalledOnce();
    expect(audio.unlocked).toBe(true);
  });
});

describe("confetti", () => {
  function themeRoot(doc: Document = document) {
    const root = doc.createElement("div");
    root.style.setProperty("--xp-primary", "#F5BA41");
    root.style.setProperty("--xp-primary-light", "#F9D48A");
    root.style.setProperty("--xp-secondary", "#FBBF24");
    root.style.setProperty("--xp-accent", "#10B981");
    doc.body.appendChild(root);
    return root;
  }

  it("draws on a canvas owned by the runtime document, in the brand colors", () => {
    expect(celebrate(themeRoot(), { reducedMotion: false })).toBe(true);
    const canvas =
      document.querySelector<HTMLCanvasElement>("[data-xp-confetti]");
    expect(canvas?.parentElement).toBe(document.body);
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    expect(canvas?.style.position).toBe("fixed");
    expect(canvas?.style.pointerEvents).toBe("none");
    // Its own canvas, resized with the viewport, even during a burst.
    expect(confetti.create).toHaveBeenCalledWith(canvas, { resize: true });
    expect(confetti.fire).toHaveBeenCalledTimes(5);
    const bursts = confetti.fire.mock.calls.map(
      ([options]) => options as { particleCount: number; colors?: string[] },
    );
    expect(
      bursts.reduce((total, burst) => total + burst.particleCount, 0),
    ).toBe(200);
    expect(bursts[0].colors).toEqual([
      "#F5BA41",
      "#F9D48A",
      "#FBBF24",
      "#10B981",
    ]);
  });

  it("keeps one canvas per document", () => {
    const root = themeRoot();
    celebrate(root, { reducedMotion: false });
    celebrate(root, { reducedMotion: false });
    expect(document.querySelectorAll("[data-xp-confetti]")).toHaveLength(1);
    expect(confetti.create).toHaveBeenCalledOnce();
  });

  it("stays in the preview's own document, never in the page around it", () => {
    const preview = document.implementation.createHTMLDocument("preview");
    celebrate(themeRoot(preview), { reducedMotion: false });
    expect(preview.querySelector("[data-xp-confetti]")).not.toBeNull();
    expect(document.querySelector("[data-xp-confetti]")).toBeNull();
    disposeConfetti(preview);
  });

  it("launches nothing with reduced motion", () => {
    expect(celebrate(themeRoot(), { reducedMotion: true })).toBe(false);
    expect(document.querySelector("[data-xp-confetti]")).toBeNull();
    expect(confetti.fire).not.toHaveBeenCalled();
  });

  it("uses the library's palette when the theme has no usable color", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);
    celebrate(root, { reducedMotion: false });
    expect(confetti.fire.mock.calls[0][0]).not.toHaveProperty("colors");
  });

  it("cleans up, and never throws", () => {
    celebrate(themeRoot(), { reducedMotion: false });
    disposeConfetti(document);
    expect(confetti.fire.reset).toHaveBeenCalledOnce();
    expect(document.querySelector("[data-xp-confetti]")).toBeNull();
    disposeConfetti(document); // nothing left: no error
    confetti.create.mockImplementationOnce(() => {
      throw new Error("no canvas");
    });
    expect(celebrate(themeRoot(), { reducedMotion: false })).toBe(false);
  });
});

describe("haptics", () => {
  it("vibrates briefly when the device can, and quietly does nothing otherwise", () => {
    const vibrateSpy = vi.fn(() => true);
    vi.stubGlobal("navigator", { vibrate: vibrateSpy });
    expect(vibrate("tap")).toBe(true);
    expect(vibrate("win")).toBe(true);
    expect(vibrateSpy.mock.calls).toEqual([[10], [[30, 60, 30]]]);

    vi.stubGlobal("navigator", {});
    expect(vibrate("tap")).toBe(false);
    vi.stubGlobal("navigator", {
      vibrate: () => {
        throw new Error("blocked");
      },
    });
    expect(vibrate("win")).toBe(false);
  });
});
