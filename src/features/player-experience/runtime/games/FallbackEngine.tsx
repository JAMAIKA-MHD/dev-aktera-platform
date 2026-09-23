import { GAME_LABELS } from "../../domain/gameTypes";
import { tint } from "../../theme/recipes";
import type { GameEngineProps } from "./types";

// Placeholder engine (plan §8.6, tasks.md T5.1): what the registry gives a mechanic that has
// no real engine yet, so `registry[gameType].Engine` is always a valid component, from T5.1
// to the day T5.2–T5.6 each replace one entry with the real thing. Never wired to a screen by
// this task (T5.1 only sets up the contract and the registry): the play screen still draws
// its own stand-in (PendingScreen.tsx, T4.1) until a screen consumes the registry.
export function FallbackEngine({ campaign }: GameEngineProps) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--xp-radius-lg)] border border-dashed p-3 text-center"
      style={{
        borderColor: tint("--xp-primary", 40),
        background: `radial-gradient(ellipse at 50% 45%, ${tint("--xp-primary", 16)}, transparent 70%)`,
      }}
    >
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--xp-text-muted)]">
        Slot 5 · {GAME_LABELS[campaign.gameType]}
      </p>
      <p className="text-xs text-[var(--xp-text-muted)]">
        Engine coming in phase 5
      </p>
    </div>
  );
}
