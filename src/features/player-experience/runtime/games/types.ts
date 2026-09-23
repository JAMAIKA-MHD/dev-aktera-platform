import type { ComponentType } from "react";
import type { CampaignSnapshot } from "../../domain/campaign";
import type { GameType } from "../../domain/gameTypes";
import type { Locale } from "../../domain/locale";
import type { DrawOutcome, GamePayload } from "../../domain/participation";
import type { ExperienceConfig, GameSettings } from "../../domain/types";

// The contracts every mechanic's engine and teaser are built against (plan §8.6, §8.7): the
// common ground T5.2 to T5.6 each fill with one registry entry (registry.ts). Nothing here
// is mechanic-specific; a mechanic that cannot be expressed through these props does not
// belong in `runtime/games/`.

// What an engine receives. It never decides "won" or "lost", never imports odds, stock or
// server code (N1): it only reads `outcome`, once the flow has it. `phase` drives it, never
// an internal timer of its own — the primary CTA and a tap on the game itself dispatch the
// very same event, so both start the very same animation.
export interface GameEngineProps {
  settings: GameSettings;
  campaign: CampaignSnapshot;
  phase: "idle" | "interacting" | "awaiting-outcome" | "revealing" | "done";
  outcome: DrawOutcome | null; // given once known
  onInteractionComplete: (payload: GamePayload) => void; // "after-interaction" mechanics
  onRevealComplete: () => void;
  reducedMotion: boolean;
  locale: Locale;
}

// Sizing contract every engine obeys (plan §8.6), on top of the props above:
// - it fills the container of slot 5 and never reads the screen's own dimensions or a media
//   query (forbidden in `runtime/games/`, guarded by gamesContract.test.ts) — only the
//   container it is given, through CSS (`cqw`/`cqh`/`cqmin`) or `useElementSize`;
// - any canvas (scratching, confetti) redraws itself from a `ResizeObserver`
//   (`useElementSize`), at `size × devicePixelRatio`, without losing its progress;
// - interactive areas stay at least 44×44 px at every size of the envelope (D19);
// - a resize mid-game (a spin in progress, the preview's own handle) never resets the game,
//   jumps, or throws;
// - Pointer Events only, never a mouse- or touch-specific listener.

// What a pregame teaser receives, on the welcome screen (slot 5): the same mechanic,
// "playing itself" like an arcade cabinet's demo mode — never a real game, never a result.
export interface GameTeaserProps {
  settings: GameSettings; // segments, cover, icons…
  campaign: CampaignSnapshot; // prizes (for labels), question count, public rules
  config: ExperienceConfig; // prizeDisplay, theme
  locale: Locale;
  reducedMotion: boolean; // → a still image, no loop
  active: boolean; // false when off screen or the tab is hidden → the animation pauses
  onStart: () => void; // a tap starts the journey (START), exactly like the primary CTA
  // The primary CTA's own text, so a teaser's accessible name matches it (D19): a screen
  // reader announces the same action whether it reaches the CTA or the teaser first.
  startLabel: string;
}

// The four rules every teaser keeps, whatever the mechanic (plan §8.7):
// 1. It shows the game, never a result: the wheel never lands on a highlighted prize, no
//    ticket ever reveals one, no box ever opens on a gift. Showing a win would be a false
//    promise, and would suggest odds that do not exist.
// 2. It is not playable: a tap dispatches START (registration, then consent), never a real
//    attempt. Playing before consent would sit uneasily with Law 18-07, and a trial run
//    could be mistaken for the real one.
// 3. It comes from the configuration: a segment, a color, an icon or a translation changed
//    in the Studio changes the teaser immediately, in the same preview.
// 4. It respects mobile battery and data: `teaser.mode === "static"` or `reducedMotion` →
//    a still image; it pauses whenever `active` is false (an `IntersectionObserver` and
//    `visibilitychange`, `useTeaserActivity`); a single `requestAnimationFrame` loop or CSS
//    animation, never one left running off screen.

// registry.ts associates each GameType with one of these: adding a mechanic after the MVP
// means adding one entry, never touching a screen (plan §8.6).
export interface GameRegistryEntry {
  Engine: ComponentType<GameEngineProps>;
  Teaser: ComponentType<GameTeaserProps>;
  // The mechanic's own slice of GameSettings, as a new campaign of this type starts with
  // (before a brand customizes it) — never the campaign's draw rules (prizes, odds, stock,
  // correct answers), which live in the campaign, never in `GameSettings` (domain/types.ts).
  defaultSettings: Partial<Omit<GameSettings, "type" | "teaser">>;
  labels: string; // Studio label (GAME_LABELS, domain/gameTypes.ts)
  autoCaption: (
    campaign: Pick<CampaignSnapshot, "gameType" | "prizes" | "quiz" | "rules">,
    locale: Locale,
  ) => string;
}

export type GameRegistry = Readonly<Record<GameType, GameRegistryEntry>>;
