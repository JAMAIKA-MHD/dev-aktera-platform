import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";
import { runtimeAudio } from "../feedback/audio";
import { tint } from "../../theme/recipes";

// The player's own sound button (music and sounds at once), in the header's end, or on the
// status row when the screen hides the header. Silent until the first gesture, as browsers
// want: it shows "off" until then, and the first tap on it turns the sound on (the gesture
// itself unlocks the audio, audio.ts). A 44 px target, whatever the theme.

const silentNow = () => runtimeAudio.muted || !runtimeAudio.unlocked;

export function SoundToggle({
  onLabel,
  offLabel,
}: {
  onLabel: string; // "Turn the sound on"
  offLabel: string; // "Turn the sound off"
}) {
  const silent = useSyncExternalStore(
    runtimeAudio.subscribe,
    silentNow,
    silentNow,
  );
  const Icon = silent ? VolumeX : Volume2;
  return (
    <button
      type="button"
      data-xp-sound-toggle
      aria-pressed={!silent}
      aria-label={silent ? onLabel : offLabel}
      title={silent ? onLabel : offLabel}
      // The tap that unlocked the audio already ran (capture): a page that was silent only
      // because of the browser turns on, a muted one too.
      onClick={() => runtimeAudio.setMuted(!silent)}
      className="xp-sound-toggle grid size-11 shrink-0 place-items-center rounded-full border transition-transform duration-150 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
      style={{
        color: "var(--xp-hud-text, var(--xp-text))",
        backgroundColor: `var(--xp-hud-bg, ${tint("--xp-surface", 72)})`,
        borderColor: `var(--xp-hud-border, ${tint("--xp-text", 14)})`,
      }}
    >
      <Icon aria-hidden className="size-5" strokeWidth={2.25} />
    </button>
  );
}
