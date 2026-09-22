import {
  BrainCircuit,
  ChartPie,
  Gift,
  Target,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { CampaignSnapshot } from "../../domain/campaign";
import type { GameType } from "../../domain/gameTypes";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import { tint } from "../../theme/recipes";
import { teaserCaption } from "./autoCaption";

// Pregame teaser shown until the game of the campaign has its own (phase 5): the icon of the
// game in a glowing medallion, and the caption. The rules of every teaser (plan §8.7) hold:
// it never shows an outcome, it is not playable (a tap emits START, like the CTA), it comes
// from the configuration, and it stands still when inactive, static or with reduced motion.
// T5.1 registers it in the game registry, under the GameTeaserProps contract.

export const GAME_ICONS: Readonly<Record<GameType, LucideIcon>> = {
  lucky_wheel: ChartPie,
  quiz: BrainCircuit,
  scratch_card: Ticket,
  mystery_box: Gift,
  hit_it: Target,
};

export interface FallbackTeaserProps {
  campaign: CampaignSnapshot;
  config: ExperienceConfig;
  locale: Locale;
  reducedMotion: boolean;
  active: boolean; // on screen and tab visible (useTeaserActivity)
  onStart: () => void;
  startLabel: string; // the welcome CTA, for the accessible name
}

export function FallbackTeaser({
  campaign,
  config,
  locale,
  reducedMotion,
  active,
  onStart,
  startLabel,
}: FallbackTeaserProps) {
  const Icon = GAME_ICONS[campaign.gameType];
  const caption = teaserCaption(config, campaign, locale);
  const still = reducedMotion || config.game.teaser.mode === "static";
  // Paused, not removed: it goes on where it stopped when it comes back on screen.
  const motion: CSSProperties = {
    animationPlayState: active ? "running" : "paused",
  };
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label={`${startLabel} · ${caption}`}
      data-xp-teaser={campaign.gameType}
      data-xp-active={active}
      className="relative isolate flex min-h-0 cursor-pointer flex-col items-center justify-center gap-[clamp(0.75rem,4cqmin,1.5rem)] rounded-[var(--xp-radius-lg)] p-4 text-center transition-transform duration-200 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--xp-primary)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[10%] -z-10 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${tint("--xp-primary", 32)}, transparent 70%)`,
        }}
      />
      <span
        className="xp-pop relative grid size-[clamp(6rem,52cqmin,13rem)] place-items-center rounded-full border"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${tint("--xp-primary", 30)}, ${tint("--xp-primary", 8)} 72%)`,
          borderColor: tint("--xp-primary", 40),
          boxShadow: `inset 0 0.4rem 1rem ${tint("--xp-surface", 45)}, 0 1.25rem 3rem -1rem ${tint("--xp-primary", 45)}`,
        }}
      >
        {!still && (
          <span
            aria-hidden
            className="xp-orbit absolute -inset-2 rounded-full border-2 border-transparent"
            style={{
              ...motion,
              borderTopColor: "var(--xp-primary)",
              borderRightColor: tint("--xp-primary", 35),
            }}
          />
        )}
        <span className={still ? "grid" : "xp-breathe grid"} style={motion}>
          <Icon
            aria-hidden
            className="size-[clamp(2.75rem,22cqmin,5.5rem)]"
            strokeWidth={1.5}
            style={{
              color: "var(--xp-primary)",
              filter: `drop-shadow(0 0.3rem 0.7rem ${tint("--xp-primary", 55)})`,
            }}
          />
        </span>
      </span>
      <span
        dir="auto"
        className="relative max-w-full rounded-full border px-4 py-1.5 text-sm font-bold"
        style={{
          backgroundColor: tint("--xp-surface", 72),
          borderColor: tint("--xp-primary", 35),
        }}
      >
        {caption}
      </span>
    </button>
  );
}
