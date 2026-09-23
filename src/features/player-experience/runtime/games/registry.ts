import { lazy } from "react";
import { buildDefaultWheelSegments } from "../../domain/defaults";
import { GAME_LABELS } from "../../domain/gameTypes";
import { SCRATCH_COVER_TEXT } from "../../presets/contentDefaults";
import { autoCaption } from "./autoCaption";
import type { GameRegistry } from "./types";

// One entry per mechanic (plan §8.6): adding one after the MVP means adding one entry here,
// never touching a screen. Each engine and each teaser is behind its own dynamic import, so
// a campaign downloads the one game it plays and none of the others — and TypeScript will
// not let a new GameType be added without a component for both.

export const registry: GameRegistry = {
  lucky_wheel: {
    Engine: lazy(() =>
      import("./wheel/WheelEngine").then((module) => ({
        default: module.WheelEngine,
      })),
    ),
    Teaser: lazy(() =>
      import("./wheel/WheelTeaser").then((module) => ({
        default: module.WheelTeaser,
      })),
    ),
    // No prizes yet for a mechanic just chosen in the Studio: the minimum wheel, all losing
    // segments (buildDefaultWheelSegments, domain/defaults.ts — the same one a real campaign's
    // prizes flow through once it has some).
    defaultSettings: { wheel: buildDefaultWheelSegments([]) },
    labels: GAME_LABELS.lucky_wheel,
    autoCaption,
  },
  scratch_card: {
    Engine: lazy(() =>
      import("./scratch/ScratchEngine").then((module) => ({
        default: module.ScratchEngine,
      })),
    ),
    Teaser: lazy(() =>
      import("./scratch/ScratchTeaser").then((module) => ({
        default: module.ScratchTeaser,
      })),
    ),
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
    Engine: lazy(() =>
      import("./boxes/BoxesEngine").then((module) => ({
        default: module.BoxesEngine,
      })),
    ),
    Teaser: lazy(() =>
      import("./boxes/BoxesTeaser").then((module) => ({
        default: module.BoxesTeaser,
      })),
    ),
    defaultSettings: { boxes: { count: 3, icon: "gift", color: null } },
    labels: GAME_LABELS.mystery_box,
    autoCaption,
  },
  quiz: {
    Engine: lazy(() =>
      import("./quiz/QuizEngine").then((module) => ({
        default: module.QuizEngine,
      })),
    ),
    Teaser: lazy(() =>
      import("./quiz/QuizTeaser").then((module) => ({
        default: module.QuizTeaser,
      })),
    ),
    defaultSettings: { quiz: { translations: {} } },
    labels: GAME_LABELS.quiz,
    autoCaption,
  },
  hit_it: {
    Engine: lazy(() =>
      import("./hitIt/HitItEngine").then((module) => ({
        default: module.HitItEngine,
      })),
    ),
    Teaser: lazy(() =>
      import("./hitIt/HitItTeaser").then((module) => ({
        default: module.HitItTeaser,
      })),
    ),
    defaultSettings: { hitIt: { targetIcon: "target", targetImage: null } },
    labels: GAME_LABELS.hit_it,
    autoCaption,
  },
};
