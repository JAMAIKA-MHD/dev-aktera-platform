// Sounds of the player screens, synthesized with the Web Audio API: no audio file to load
// (sounds of player-editor/aktera-audio.ts, which the prototype shares). A theme may bring its
// own recordings (theme.json "sounds", setSoundFiles): those play instead, and a sound the
// theme has no file for, or whose file the browser refuses, is still synthesized. Browsers only let
// a page make noise after a user gesture: nothing plays, and no AudioContext even exists,
// before the first tap or key press. Sound is off while features.sound is false. A sound
// is a nicety: it never throws, whatever the browser refuses.
//
// Under the sounds, a music loops for as long as the page is open (setMusic): it starts with
// the first gesture too, pauses while the page is hidden, and stops with features.sound. The
// player can mute everything at once (setMuted, the runtime's sound button).

export type SoundName =
  | "click"
  | "tick"
  | "countdown"
  | "scratch"
  | "win"
  | "lose"
  | "reward"
  | "pop"
  | "swoosh";

interface Tone {
  frequency: number;
  to?: number; // frequency glide
  type: OscillatorNode["type"];
  start: number; // seconds after the call
  duration: number;
  gain: number;
  attack?: number; // soft start, for the chords
}

const chord = (
  frequencies: readonly number[],
  step: number,
  duration: number,
  gain: number,
  attack: number,
  brightLast = false, // the last note rings brighter (win)
): Tone[] =>
  frequencies.map((frequency, index) => ({
    frequency,
    type: brightLast && index === frequencies.length - 1 ? "triangle" : "sine",
    start: index * step,
    duration,
    gain,
    attack,
  }));

const TONES: Readonly<
  Record<Exclude<SoundName, "scratch" | "swoosh">, Tone[]>
> = {
  click: [
    {
      frequency: 420,
      to: 160,
      type: "sine",
      start: 0,
      duration: 0.05,
      gain: 0.12,
    },
  ],
  tick: [
    {
      frequency: 700,
      to: 300,
      type: "triangle",
      start: 0,
      duration: 0.03,
      gain: 0.15,
    },
  ],
  countdown: [
    { frequency: 880, type: "sine", start: 0, duration: 0.04, gain: 0.09 },
  ],
  win: chord([523.25, 659.25, 783.99, 1046.5], 0.09, 0.45, 0.2, 0.03, true), // C5 E5 G5 C6
  lose: chord([392.0, 311.13, 261.63], 0.14, 0.4, 0.12, 0.04), // G4 Eb4 C4
  reward: chord([783.99, 1046.5, 1318.51], 0.07, 0.3, 0.16, 0.02, true), // G5 C6 E6
  pop: [
    {
      frequency: 520,
      to: 980,
      type: "sine",
      start: 0,
      duration: 0.08,
      gain: 0.12,
    },
  ],
};

// A chiptune voice (a pixel theme, motion.chiptune): every tone in square waves, quieter,
// since a square wave carries further than a sine.
const CHIP_GAIN = 0.45;

// A chiptune win: a short victory jingle rather than a chord (C5 E5 G5 C6, G5, then C6 held).
const CHIP_WIN: Tone[] = [
  [523.25, 0, 0.1],
  [659.25, 0.1, 0.1],
  [783.99, 0.2, 0.1],
  [1046.5, 0.3, 0.18],
  [783.99, 0.5, 0.1],
  [1046.5, 0.62, 0.7],
].map(([frequency, start, duration]) => ({
  frequency: frequency!,
  type: "square" as const,
  start: start!,
  duration: duration!,
  gain: 0.16,
}));

function playTone(context: AudioContext, tone: Tone, chip = false): void {
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const at = context.currentTime + tone.start;
  oscillator.type = chip ? "square" : tone.type;
  if (chip) tone = { ...tone, gain: tone.gain * CHIP_GAIN };
  oscillator.frequency.setValueAtTime(tone.frequency, at);
  if (tone.to) {
    oscillator.frequency.exponentialRampToValueAtTime(
      tone.to,
      at + tone.duration,
    );
  }
  if (tone.attack) {
    volume.gain.setValueAtTime(0.001, at);
    volume.gain.linearRampToValueAtTime(tone.gain, at + tone.attack);
  } else {
    volume.gain.setValueAtTime(tone.gain, at);
  }
  volume.gain.exponentialRampToValueAtTime(0.001, at + tone.duration);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + tone.duration);
}

// A short burst of filtered noise: the coin on the scratch card. Longer and sweeping up, the
// air of a screen wiped away (swoosh).
function playNoise(
  context: AudioContext,
  seconds: number,
  from: number,
  to: number,
  gain: number,
): void {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < length; index++) {
    samples[index] = Math.random() * 2 - 1;
  }
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(from, context.currentTime);
  if (to !== from) {
    filter.frequency.exponentialRampToValueAtTime(
      to,
      context.currentTime + seconds,
    );
  }
  filter.Q.value = 3;
  const volume = context.createGain();
  volume.gain.setValueAtTime(gain, context.currentTime);
  volume.gain.exponentialRampToValueAtTime(
    0.001,
    context.currentTime + seconds,
  );
  noise.connect(filter);
  filter.connect(volume);
  volume.connect(context.destination);
  noise.start();
}

export interface AudioFeedback {
  readonly unlocked: boolean; // a gesture has created the audio context
  unlock(): void; // to call from a user gesture
  setEnabled(enabled: boolean): void; // features.sound
  // The theme's own recordings (bundled URLs), replacing the synthesized sounds they name.
  setSoundFiles(files: Readonly<Partial<Record<SoundName, string>>>): void;
  setChiptune(chiptune: boolean): void; // synthesized sounds in square waves
  play(sound: SoundName): void;
  // The music looping under the sounds (a bundled URL), or none.
  setMusic(url: string | null): void;
  setHidden(hidden: boolean): void; // the page is out of sight: the music pauses
  readonly muted: boolean;
  setMuted(muted: boolean): void; // the player's own choice, for music and sounds
  // Called whenever `unlocked` or `muted` changes (the sound button).
  subscribe(listener: () => void): () => void;
}

const MUSIC_VOLUME = 0.28; // under the sounds, never over them

type AudioFactory = (url: string) => HTMLAudioElement | null;

function browserAudio(url: string): HTMLAudioElement | null {
  return typeof Audio === "function" ? new Audio(url) : null;
}

type ContextFactory = () => AudioContext | null;

function browserContext(): AudioContext | null {
  const Context =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return Context ? new Context() : null;
}

export function createAudioFeedback(
  createContext: ContextFactory = browserContext,
  createAudio: AudioFactory = browserAudio,
): AudioFeedback {
  let context: AudioContext | null = null;
  let enabled = true;
  let files: Readonly<Partial<Record<SoundName, string>>> = {};
  const recordings = new Map<string, HTMLAudioElement>();
  let muted = false;
  let hidden = false;
  let chiptune = false;
  let musicUrl: string | null = null;
  let music: { url: string; audio: HTMLAudioElement } | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  const synthesize = (sound: SoundName) => {
    if (!context) return;
    if (sound === "scratch") playNoise(context, 0.04, 1800, 1800, 0.08);
    else if (sound === "swoosh") playNoise(context, 0.28, 500, 3200, 0.07);
    else if (sound === "win" && chiptune) {
      for (const tone of CHIP_WIN) playTone(context, tone, true);
    } else for (const tone of TONES[sound]) playTone(context, tone, chiptune);
  };
  // The music plays once a gesture has unlocked the page, while sound is on, not muted and
  // the page in sight; otherwise it pauses, and picks up where it was. It loops forever.
  const updateMusic = () => {
    try {
      const audible =
        context !== null && enabled && !muted && !hidden && musicUrl !== null;
      if (!audible || musicUrl === null) {
        music?.audio.pause();
        return;
      }
      if (music?.url !== musicUrl) {
        music?.audio.pause();
        const audio = createAudio(musicUrl);
        if (!audio) return;
        audio.loop = true;
        audio.volume = MUSIC_VOLUME;
        music = { url: musicUrl, audio };
      }
      if (music.audio.paused) void music.audio.play().catch(() => {});
    } catch {
      // The browser refused the music: the game goes on without it.
    }
  };
  return {
    get unlocked() {
      return context !== null;
    },
    unlock() {
      const was = context !== null;
      try {
        context ??= createContext();
        // A context created too early starts suspended; a gesture may resume it.
        if (context?.state === "suspended") {
          void context.resume().catch(() => {});
        }
      } catch {
        context = null;
      }
      // Still inside the gesture: the browser lets the music start now.
      updateMusic();
      if (was !== (context !== null)) notify();
    },
    setEnabled(value) {
      enabled = value;
      updateMusic();
    },
    setChiptune(value) {
      chiptune = value;
    },
    setSoundFiles(value) {
      files = value;
    },
    setMusic(url) {
      musicUrl = url;
      updateMusic();
    },
    setHidden(value) {
      hidden = value;
      updateMusic();
    },
    get muted() {
      return muted;
    },
    setMuted(value) {
      if (muted === value) return;
      muted = value;
      updateMusic();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    play(sound) {
      // Nothing before the first gesture, recordings included (autoplay rules).
      if (!enabled || muted || !context) return;
      try {
        const url = files[sound];
        const recording = url
          ? (recordings.get(url) ??
            (() => {
              const created = createAudio(url);
              if (created) recordings.set(url, created);
              return created;
            })())
          : null;
        if (!recording) return synthesize(sound);
        recording.currentTime = 0; // a tick replayed before the last one ended restarts
        void recording.play().catch(() => synthesize(sound));
      } catch {
        // The browser refused this sound: the game goes on in silence.
      }
    },
  };
}

// One audio feedback per runtime document (the page, or the preview iframe).
export const runtimeAudio = createAudioFeedback();

// Unlocks the audio on the first gesture anywhere in the document, then stops listening.
export function unlockOnFirstGesture(
  doc: Document,
  audio: AudioFeedback,
): () => void {
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const stop = () => {
    for (const event of events) doc.removeEventListener(event, onGesture, true);
  };
  function onGesture() {
    audio.unlock();
    stop();
  }
  for (const event of events) doc.addEventListener(event, onGesture, true);
  return stop;
}
