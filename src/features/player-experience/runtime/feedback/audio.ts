// Sounds of the player screens, synthesized with the Web Audio API: no audio file to load
// (sounds of player-editor/aktera-audio.ts, which the prototype shares). Browsers only let
// a page make noise after a user gesture: nothing plays, and no AudioContext even exists,
// before the first tap or key press. Sound is off while features.sound is false. A sound
// is a nicety: it never throws, whatever the browser refuses.

export type SoundName =
  "click" | "tick" | "countdown" | "scratch" | "win" | "lose";

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

const TONES: Readonly<Record<Exclude<SoundName, "scratch">, Tone[]>> = {
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
};

function playTone(context: AudioContext, tone: Tone): void {
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const at = context.currentTime + tone.start;
  oscillator.type = tone.type;
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

// A short burst of filtered noise: the coin on the scratch card.
function playScratch(context: AudioContext): void {
  const length = Math.floor(context.sampleRate * 0.04);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < length; index++) {
    samples[index] = Math.random() * 2 - 1;
  }
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 3;
  const volume = context.createGain();
  volume.gain.setValueAtTime(0.08, context.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.04);
  noise.connect(filter);
  filter.connect(volume);
  volume.connect(context.destination);
  noise.start();
}

export interface AudioFeedback {
  readonly unlocked: boolean; // a gesture has created the audio context
  unlock(): void; // to call from a user gesture
  setEnabled(enabled: boolean): void; // features.sound
  play(sound: SoundName): void;
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
): AudioFeedback {
  let context: AudioContext | null = null;
  let enabled = true;
  return {
    get unlocked() {
      return context !== null;
    },
    unlock() {
      try {
        context ??= createContext();
        // A context created too early starts suspended; a gesture may resume it.
        if (context?.state === "suspended") {
          void context.resume().catch(() => {});
        }
      } catch {
        context = null;
      }
    },
    setEnabled(value) {
      enabled = value;
    },
    play(sound) {
      if (!enabled || !context) return;
      try {
        if (sound === "scratch") playScratch(context);
        else for (const tone of TONES[sound]) playTone(context, tone);
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
