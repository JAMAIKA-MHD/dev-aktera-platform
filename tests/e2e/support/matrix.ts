// The matrix the suite loops over, read from the app's own lists: a template added to
// domain/templates.ts or a game added to domain/gameTypes.ts is tested without touching
// a test. Read as text, like scripts/xp-responsive-check.mjs reads the breakpoints: the
// module is only imported through its public entry, which a Node test cannot load.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAIN = resolve(process.cwd(), "src/features/player-experience/domain");
const quoted = (block: string) =>
  [...block.matchAll(/"([a-z0-9_-]+)"/g)].map((match) => match[1]);

export type TemplateId = string;
export type GameType = string;

export const TEMPLATES: readonly TemplateId[] = quoted(
  /export const TEMPLATE_IDS = \[([^\]]*)\]/.exec(
    readFileSync(resolve(DOMAIN, "templates.ts"), "utf8"),
  )?.[1] ?? "",
);
export const GAMES: readonly GameType[] = quoted(
  /export type GameType =([^;]*);/.exec(
    readFileSync(resolve(DOMAIN, "gameTypes.ts"), "utf8"),
  )?.[1] ?? "",
);
if (TEMPLATES.length === 0 || GAMES.length === 0)
  throw new Error("Could not read the templates or the games from domain/.");

// The Studio's name of each template (its library card).
export const TEMPLATE_LABELS: Record<string, RegExp> = {
  "eight-slot": /^Classic/,
  "comic-burst": /^Cartoon Pop/,
  "pixel-quest": /^Pixel Quest/,
  "arcade-night": /^Arcade Night/,
  "quiz-show": /^Quiz Show/,
};

// The fixture of /xp-frame that shows a game's play screen.
export const PLAY_FIXTURE: Record<string, string> = {
  lucky_wheel: "wheel-play",
  scratch_card: "scratch-play",
  mystery_box: "boxes-play",
  quiz: "quiz-play",
  hit_it: "hit-it-play",
};

export interface Cell {
  template: TemplateId;
  game: GameType;
  key: string; // short, for slugs and file names
  winning: boolean; // the campaign always wins, or never: both result screens are played
}

export const CELLS: Cell[] = TEMPLATES.flatMap((template, t) =>
  GAMES.map((game, g) => ({
    template,
    game,
    key: `${template}-${game}`.replace(/_/g, "-"),
    winning: (t + g) % 2 === 0,
  })),
);

export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 },
} as const;
