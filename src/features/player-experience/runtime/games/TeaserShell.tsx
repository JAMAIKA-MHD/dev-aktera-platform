import type { ReactNode } from "react";
import { tint } from "../../theme/recipes";
import { teaserCaption } from "./autoCaption";
import type { GameTeaserProps } from "./types";

// What every pregame teaser shares (plan §8.7): the whole thing is one button — touching it
// starts the journey, never a game (rule 2) — a halo, the mechanic's own drawing, and the
// caption underneath. Each mechanic only brings its drawing; the rules, the accessible name
// and the caption are settled once, here, for all five.
export function TeaserShell({
  campaign,
  config,
  locale,
  active,
  onStart,
  startLabel,
  children,
}: GameTeaserProps & { children: ReactNode }) {
  const caption = teaserCaption(config, campaign, locale);
  return (
    <button
      type="button"
      onClick={onStart}
      aria-label={`${startLabel} · ${caption}`}
      data-xp-teaser={campaign.gameType}
      data-xp-active={active}
      className="relative isolate flex min-h-0 w-full cursor-pointer flex-col items-center justify-center gap-[clamp(0.6rem,3cqmin,1.25rem)] rounded-[var(--xp-radius-lg)] p-2 text-center transition-transform duration-200 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--xp-primary)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[12%] -z-10 rounded-full blur-2xl"
        style={{
          background: `radial-gradient(circle, ${tint("--xp-primary", 32)}, transparent 70%)`,
        }}
      />
      {children}
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
