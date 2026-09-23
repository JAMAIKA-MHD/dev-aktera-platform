import type { ReactNode, Ref } from "react";
import type { CampaignSnapshot } from "../../../domain/campaign";
import { resolvePrizeDisplay } from "../../../domain/display";
import { resolveText, type Locale } from "../../../domain/locale";
import type { DrawOutcome } from "../../../domain/participation";
import type { ExperienceConfig } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { cardStyle } from "../../../theme/recipes";

// The ticket, drawn once and shared by the engine and the pregame teaser (plan §8.7): the
// brand's own cover and text, and underneath, what the card hides. Pure drawing — the layer
// that gets scratched away is a canvas the engine owns, handed in as `cover`.

export interface ScratchCardFaceProps {
  campaign: CampaignSnapshot;
  config: ExperienceConfig;
  locale: Locale;
  // What the card hides. The teaser passes none: it never reveals a prize (rule 1).
  outcome?: DrawOutcome | null;
  cover: ReactNode; // the scratchable layer (a canvas), or a still cover for the teaser
  cardRef?: Ref<HTMLDivElement>;
}

export function ScratchCardFace({
  campaign,
  config,
  locale,
  outcome,
  cover,
  cardRef,
}: ScratchCardFaceProps) {
  const fallback = config.locales.default;
  const display = outcome?.prize
    ? resolvePrizeDisplay(outcome.prize.id, config, campaign, locale)
    : null;
  const Icon = display?.icon ? ICON_COMPONENTS[display.icon] : null;

  return (
    <div
      ref={cardRef}
      data-xp-scratch
      // Sized on whatever box it is given, capped by the slot (plan §8.6): asking for the
      // slot's full width would spill out of a parent with padding of its own — the teaser's.
      className="relative isolate aspect-[3/2] w-full max-w-[min(100cqw,150cqh)] overflow-hidden border"
      style={cardStyle}
    >
      {/* Underneath: what the draw gave. Never read before the cover is scratched off. */}
      <div className="absolute inset-0 grid place-items-center gap-1 p-4 text-center">
        {Icon && (
          <Icon
            aria-hidden
            className="size-[clamp(1.75rem,12cqmin,3rem)]"
            strokeWidth={1.75}
            style={{ color: "var(--xp-primary)" }}
          />
        )}
        <p
          dir="auto"
          data-xp-clamp
          className="line-clamp-2 text-[clamp(1.1rem,6cqmin,1.75rem)] leading-tight font-black wrap-anywhere"
        >
          {/* A losing card says so in the brand's own words, the ones of the screen that
              follows — never a made-up consolation of the engine's own. */}
          {display?.label ??
            (outcome
              ? resolveText(config.screens.lose.title, locale, fallback)
              : "")}
        </p>
      </div>
      {cover}
    </div>
  );
}

// The cover's own look, shared by the canvas the engine paints and the teaser's still image:
// a foil in the brand colour, so both tickets are the same ticket. Every mix is against the
// surface, never against transparent: a cover that lets the prize show through would give
// the result away before a single scratch (C5 all the same — no colour is written here).
const foil = (variable: `--xp-${string}`, percent: number) =>
  `color-mix(in srgb, var(${variable}) ${percent}%, var(--xp-surface))`;

export const SCRATCH_COVER_INK = foil("--xp-primary", 72);

export const scratchCoverStyle = {
  background: `linear-gradient(135deg, ${foil("--xp-primary", 88)}, ${foil("--xp-primary", 55)} 45%, ${foil("--xp-primary", 80)})`,
};
