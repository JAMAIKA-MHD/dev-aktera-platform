import { Gift, Sparkles, Timer, Trophy, type LucideIcon } from "lucide-react";
import type { ScreenContent } from "../../../domain/types";
import { tint } from "../../../theme/recipes";

// Slot 2 (prototype Slot2HeroVisual): one dominant visual, a glowing medallion in the brand
// color. Never a text: the prototype's timer read "Chrono Express • 15s", in French only.

export type HeroKind = Exclude<ScreenContent["hero"], "none">;

const HERO_ICONS: Readonly<Record<HeroKind, LucideIcon>> = {
  badge: Sparkles,
  trophy: Trophy,
  gift: Gift,
  timer: Timer,
};

export function HeroVisualSlot({
  hero,
  editPath,
}: {
  hero: HeroKind;
  editPath: string | null;
}) {
  const Icon = HERO_ICONS[hero];
  return (
    <div
      data-xp-slot="hero"
      data-xp-edit={editPath ? `${editPath}.hero` : undefined}
      data-xp-hero={hero}
      className="flex justify-center split:justify-start"
    >
      <div
        className="xp-pop relative grid size-[clamp(4.5rem,min(22vw,11svh),6rem)] place-items-center rounded-full border"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${tint("--xp-primary", 30)}, ${tint("--xp-primary", 8)} 72%)`,
          borderColor: tint("--xp-primary", 40),
          boxShadow: `inset 0 0.3rem 0.8rem ${tint("--xp-surface", 45)}, 0 0 2.5rem ${tint("--xp-primary", 32)}`,
        }}
      >
        {hero === "timer" && (
          // A turning arc around the clock: motion without any number.
          <span
            aria-hidden
            className="xp-orbit absolute -inset-1 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "var(--xp-primary)" }}
          />
        )}
        <Icon
          aria-hidden
          className="size-[46%]"
          strokeWidth={1.75}
          style={{
            color: "var(--xp-primary)",
            filter: `drop-shadow(0 0.2rem 0.45rem ${tint("--xp-primary", 50)})`,
          }}
        />
        {hero === "gift" && (
          <span
            aria-hidden
            className="xp-wiggle absolute -end-0.5 -top-0.5 grid size-[32%] place-items-center rounded-full"
            style={{
              background:
                "linear-gradient(135deg, var(--xp-primary-light), var(--xp-primary))",
              color: "var(--xp-on-primary)",
              boxShadow: `0 0.25rem 0.6rem -0.1rem ${tint("--xp-primary", 55)}`,
            }}
          >
            <Sparkles className="size-[60%]" strokeWidth={2.5} />
          </span>
        )}
      </div>
    </div>
  );
}
