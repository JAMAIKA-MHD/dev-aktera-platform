import { lazy } from "react";
import { buildDefaultWheelSegments } from "../../domain/defaults";
import { GAME_LABELS } from "../../domain/gameTypes";
import { SCRATCH_COVER_TEXT } from "../../presets/contentDefaults";
import { autoCaption } from "./autoCaption";
import type { GameRegistry } from "./types";

// One entry per mechanic (plan §8.6): adding one after the MVP means adding one entry here,
// never touching a screen. The engine and the teaser are lazy — until T5.2–T5.6 give a
// mechanic its own module, every entry points at the same fallback pair, but the shape (one
// dynamic import per mechanic) is already the one real modules will use, code-split so a
// campaign only ever loads the one game it plays.
const fallbackEngine = () =>
  import("./FallbackEngine").then((module) => ({
    default: module.FallbackEngine,
  }));
const fallbackTeaser = () =>
  import("./FallbackTeaser").then((module) => ({
    default: module.FallbackTeaser,
  }));

export const registry: GameRegistry = {
  lucky_wheel: {
    Engine: lazy(fallbackEngine),
    Teaser: lazy(fallbackTeaser),
    // No prizes yet for a mechanic just chosen in the Studio: the minimum wheel, all losing
    // segments (buildDefaultWheelSegments, domain/defaults.ts — the same one a real campaign's
    // prizes flow through once it has some).
    defaultSettings: { wheel: buildDefaultWheelSegments([]) },
    labels: GAME_LABELS.lucky_wheel,
    autoCaption,
  },
  scratch_card: {
    Engine: lazy(fallbackEngine),
    Teaser: lazy(fallbackTeaser),
    defaultSettings: {
      scratch: {
        coverImage: null,
        coverText: SCRATCH_COVER_TEXT,
        revealThresholdPercent: 50,
      },
    },
    labels: GAME_LABELS.scratch_card,
    autoCaption,
  },
  mystery_box: {
    Engine: lazy(fallbackEngine),
    Teaser: lazy(fallbackTeaser),
    defaultSettings: { boxes: { count: 3, icon: "gift", color: null } },
    labels: GAME_LABELS.mystery_box,
    autoCaption,
  },
  quiz: {
    Engine: lazy(fallbackEngine),
    Teaser: lazy(fallbackTeaser),
    defaultSettings: { quiz: { translations: {} } },
    labels: GAME_LABELS.quiz,
    autoCaption,
  },
  hit_it: {
    Engine: lazy(fallbackEngine),
    Teaser: lazy(fallbackTeaser),
    defaultSettings: { hitIt: { targetIcon: "target", targetImage: null } },
    labels: GAME_LABELS.hit_it,
    autoCaption,
  },
};
