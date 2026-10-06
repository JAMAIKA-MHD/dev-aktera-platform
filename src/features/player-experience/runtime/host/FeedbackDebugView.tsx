import { useEffect, useState, type MouseEvent } from "react";
import type { ExperienceConfig } from "../../domain/types";
import { cardStyle, primaryButtonStyle } from "../../theme/recipes";
import {
  runtimeAudio,
  unlockOnFirstGesture,
  type SoundName,
} from "../feedback/audio";
import { celebrate } from "../feedback/confetti";
import { vibrate } from "../feedback/haptics";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useDwellTime } from "../hooks/useDwellTime";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSessionId } from "../hooks/useSessionId";

// Control view of /xp-frame?fixture=feedback-debug: every sensory feedback and runtime hook
// of T3.7, one button each, to try them in a real browser and on a real phone.

const SOUNDS: readonly SoundName[] = [
  "click",
  "tick",
  "countdown",
  "scratch",
  "win",
  "lose",
];
const EYEBROW =
  "text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--xp-text-muted)]";
const BUTTON =
  "min-h-[44px] px-4 text-sm font-extrabold transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
      <span className="text-[var(--xp-text-muted)]">{label}</span>
      <span
        data-testid={`feedback-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className="min-w-0 truncate font-bold"
      >
        {value}
      </span>
    </p>
  );
}

export function FeedbackDebugView({ config }: { config: ExperienceConfig }) {
  const reducedMotion = useReducedMotion(config.features.animations);
  const sessionId = useSessionId();
  const dwellTime = useDwellTime();
  const { copied, copy } = useCopyToClipboard();
  const [status, setStatus] = useState("—");
  const [unlocked, setUnlocked] = useState(runtimeAudio.unlocked);

  useEffect(() => {
    runtimeAudio.setEnabled(config.features.sound);
    return unlockOnFirstGesture(document, runtimeAudio);
  }, [config.features.sound]);

  const play = (sound: SoundName) => {
    runtimeAudio.play(sound);
    setUnlocked(runtimeAudio.unlocked);
    setStatus(`${sound} · ${dwellTime()} s`);
  };
  // The theme variables are inherited: the button itself carries the brand colors.
  const confetti = (event: MouseEvent<HTMLButtonElement>) => {
    const launched = celebrate(event.currentTarget, { reducedMotion });
    setStatus(launched ? "confetti" : "confetti skipped (reduced motion)");
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-[max(1rem,var(--xp-safe-top))]">
      <header className="flex flex-col gap-1">
        <p className={EYEBROW}>Feedback debug</p>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight">
          Sounds, confetti and hooks
        </h1>
      </header>
      <section className="flex flex-col gap-2 border p-4" style={cardStyle}>
        <Row
          label="Sound"
          value={
            config.features.sound
              ? unlocked
                ? "unlocked"
                : "locked until a gesture"
              : "off"
          }
        />
        <Row label="Reduced motion" value={reducedMotion ? "yes" : "no"} />
        <Row label="Session" value={sessionId} />
        <Row label="Last" value={status} />
      </section>
      <section className="flex flex-wrap gap-2">
        {SOUNDS.map((sound) => (
          <button
            key={sound}
            type="button"
            onClick={() => play(sound)}
            className={`${BUTTON} rounded-[var(--xp-radius-pill)] border`}
            style={{ ...cardStyle, borderRadius: "var(--xp-radius-pill)" }}
          >
            {sound}
          </button>
        ))}
      </section>
      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confetti}
          className={BUTTON}
          style={primaryButtonStyle}
        >
          Confetti
        </button>
        <button
          type="button"
          onClick={() =>
            setStatus(vibrate("win") ? "vibrated" : "no vibration here")
          }
          className={`${BUTTON} border`}
          style={{ ...cardStyle, borderRadius: "var(--xp-radius-pill)" }}
        >
          Vibrate
        </button>
        <button
          type="button"
          onClick={() => void copy(sessionId)}
          className={`${BUTTON} border`}
          style={{ ...cardStyle, borderRadius: "var(--xp-radius-pill)" }}
        >
          {copied ? "Copied" : "Copy session id"}
        </button>
      </section>
    </main>
  );
}
