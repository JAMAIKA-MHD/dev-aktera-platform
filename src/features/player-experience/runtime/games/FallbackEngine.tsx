import { useEffect } from "react";
import { GAME_LABELS } from "../../domain/gameTypes";
import { tint } from "../../theme/recipes";
import type { GameEngineProps } from "./types";

// Placeholder engine (plan §8.6, tasks.md T5.1): what the registry gives a mechanic that has
// no real engine yet, so `registry[gameType].Engine` is always a valid component, until
// T5.3–T5.6 each replace one entry with the real thing.
//
// It draws nothing of the game, but it does honour the two moments the journey waits on, so
// no mechanic is ever stuck behind a missing engine (B9): it ends the reveal at once (there
// is no animation to watch), and offers a way to finish a game that is played before the draw.
export function FallbackEngine({
  campaign,
  phase,
  onInteractionComplete,
  onRevealComplete,
}: GameEngineProps) {
  const revealing = phase === "revealing";
  useEffect(() => {
    if (revealing) onRevealComplete();
  }, [revealing, onRevealComplete]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-[var(--xp-radius-lg)] border border-dashed p-3 text-center"
      style={{
        borderColor: tint("--xp-primary", 40),
        background: `radial-gradient(ellipse at 50% 45%, ${tint("--xp-primary", 16)}, transparent 70%)`,
      }}
      data-xp-game={campaign.gameType}
      data-xp-phase={phase}
    >
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--xp-text-muted)]">
        Slot 5 · {GAME_LABELS[campaign.gameType]}
      </p>
      <p className="text-xs text-[var(--xp-text-muted)]">
        Engine coming in phase 5
      </p>
      {phase === "interacting" && (
        <button
          type="button"
          onClick={() => onInteractionComplete({ kind: "none" })}
          className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-[var(--xp-radius-pill)] border px-4 text-xs font-bold transition-colors duration-200 hover:border-[color:var(--xp-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
          style={{ borderColor: tint("--xp-text", 14) }}
        >
          Send a stand-in play
        </button>
      )}
    </div>
  );
}
