import type { PrizeChip, PrizeChipsSection } from "../../domain/types";
import { ICON_COMPONENTS } from "../../presets/icons";
import { tint } from "../../theme/recipes";

// The prize chips of the reference welcome screen (prototype WelcomeTeaser): 1 to 4 small
// cards, each with an icon in one of the theme colors, a value and a caption. On one line
// while they fit, then two by two, never squashed: frame.css picks the columns from the
// width really available (container queries), so 4 chips never split into 3 + 1.

const MAX_CHIPS = 4;

const TONES: Readonly<Record<PrizeChip["tone"], `--xp-${string}`>> = {
  primary: "--xp-primary",
  secondary: "--xp-secondary",
  accent: "--xp-accent",
};

export function PrizeChips({
  section,
  text,
}: {
  section: PrizeChipsSection;
  text: (value: PrizeChip["value"]) => string;
}) {
  const chips = section.items
    .slice(0, MAX_CHIPS)
    .map((chip) => ({
      ...chip,
      value: text(chip.value),
      caption: text(chip.caption),
    }))
    .filter((chip) => chip.value || chip.caption);
  if (chips.length === 0) return null;
  return (
    <div data-xp-edit="sections.prizeChips" className="xp-chips-box">
      <ul data-xp-chips={chips.length} className="xp-chips">
        {chips.map((chip) => {
          const Icon = ICON_COMPONENTS[chip.icon];
          const tone = TONES[chip.tone];
          return (
            <li
              key={chip.id}
              className="flex min-w-0 flex-col items-center gap-0.5 rounded-[var(--xp-radius-md)] border px-2 py-2 text-center"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--xp-text) 5%, color-mix(in srgb, var(--xp-surface) 70%, transparent))",
                borderColor: tint("--xp-text", 12),
              }}
            >
              <span
                aria-hidden
                className="mb-0.5 grid size-6 place-items-center rounded-full"
                style={{
                  color: `var(${tone})`,
                  backgroundColor: tint(tone, 16),
                }}
              >
                <Icon className="size-3.5" strokeWidth={2.5} />
              </span>
              {chip.value && (
                <span
                  dir="auto"
                  data-xp-clamp
                  className="line-clamp-2 max-w-full text-[0.75rem] leading-tight font-extrabold wrap-anywhere"
                >
                  {chip.value}
                </span>
              )}
              {chip.caption && (
                <span
                  dir="auto"
                  data-xp-clamp
                  className="line-clamp-3 max-w-full text-[0.62rem] leading-snug font-medium text-[var(--xp-text-muted)] wrap-anywhere"
                >
                  {chip.caption}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
