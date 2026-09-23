import {
  BrainCircuit,
  ChartPie,
  Gift,
  Target,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { GameType } from "../../domain/gameTypes";
import { tint } from "../../theme/recipes";
import { TeaserShell } from "./TeaserShell";
import type { GameTeaserProps } from "./types";

// Pregame teaser shown until the game of the campaign has its own (phase 5): the icon of the
// game in a glowing medallion. The rules of every teaser (plan §8.7) are kept by TeaserShell
// around it; what is left here is only the drawing, and it stands still when inactive, static
// or with reduced motion. Registered under the mechanics T5.2–T5.6 have not reached yet.

export const GAME_ICONS: Readonly<Record<GameType, LucideIcon>> = {
  lucky_wheel: ChartPie,
  quiz: BrainCircuit,
  scratch_card: Ticket,
  mystery_box: Gift,
  hit_it: Target,
};

export function FallbackTeaser(props: GameTeaserProps) {
  const { settings, campaign, reducedMotion, active } = props;
  const Icon = GAME_ICONS[campaign.gameType];
  const still = reducedMotion || settings.teaser.mode === "static";
  // Paused, not removed: it goes on where it stopped when it comes back on screen.
  const motion: CSSProperties = {
    animationPlayState: active ? "running" : "paused",
  };
  return (
    <TeaserShell {...props}>
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
    </TeaserShell>
  );
}
