import { Suspense } from "react";
import { createDefaultExperience } from "../../domain/defaults";
import { GAME_LABELS, type GameType } from "../../domain/gameTypes";
import type { Locale } from "../../domain/locale";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { tint } from "../../theme/recipes";
import { registry } from "../games/registry";

// Control page of /xp-frame?fixture=all-games (tasks.md T5.7): the five pregame teasers on
// one page, each with its own demo campaign, so a single sweep checks all of them at once —
// that they show their own mechanic, that none shows a prize, and that none of them breaks
// the layout at any size.
//
// They are drawn still (reducedMotion). Five animation loops at once is a load no player
// ever meets — a player sees one teaser — and it made this page too busy to even answer the
// audit. Each mechanic's motion is checked on its own fixture and in its own tests.

const GAME_TYPES = Object.keys(GAME_LABELS) as GameType[];

export function AllGamesView({ locale }: { locale: Locale }) {
  return (
    <main className="flex flex-1 flex-col gap-3 p-[max(0.75rem,var(--xp-safe-top))_max(0.75rem,var(--xp-safe-right))_max(0.75rem,var(--xp-safe-bottom))_max(0.75rem,var(--xp-safe-left))]">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--xp-text-muted)]">
        Pregame teasers · {GAME_TYPES.length} mechanics · still
      </p>
      <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
        {GAME_TYPES.map((gameType) => {
          const campaign = createDemoCampaign(gameType);
          const config = createDefaultExperience({ gameType, campaign });
          const Teaser = registry[gameType].Teaser;
          return (
            <section
              key={gameType}
              data-xp-game-cell={gameType}
              className="flex min-w-0 flex-col gap-2 rounded-[var(--xp-radius-lg)] border p-2"
              style={{ borderColor: tint("--xp-text", 12) }}
            >
              <p className="text-xs font-bold text-[var(--xp-text-muted)]">
                {registry[gameType].labels}
              </p>
              {/* Each cell is its own size container, like slot 5 is for a real screen. */}
              <div className="grid min-h-[12rem] flex-1 [container-type:size]">
                <Suspense fallback={null}>
                  <Teaser
                    settings={config.game}
                    campaign={campaign}
                    config={config}
                    locale={locale}
                    reducedMotion
                    active
                    onStart={() => {}}
                    startLabel={registry[gameType].labels}
                  />
                </Suspense>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
