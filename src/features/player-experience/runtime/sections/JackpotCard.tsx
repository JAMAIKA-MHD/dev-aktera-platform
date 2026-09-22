import { Sparkles } from "lucide-react";
import type { JackpotSection } from "../../domain/types";
import { ICON_COMPONENTS } from "../../presets/icons";
import { tint } from "../../theme/recipes";
import { spacedCaps } from "../frame/text";

// The "GRAND JACKPOT" card of the reference welcome screen (prototype WelcomeTeaser): a
// glowing pill in the brand color that breathes gently, its icon, a spaced eyebrow, the
// headline and an optional badge. Every text comes from the configuration. The headline
// keeps at least 9rem: on a narrow phone the badge goes under it instead of squeezing it.

// Brand color pulled toward the text color: an ink that stays readable on the surface,
// whatever the brand color (a pale yellow on white, a deep blue on navy).
export const BRAND_INK =
  "color-mix(in srgb, var(--xp-primary) 70%, var(--xp-text))";

export function JackpotCard({
  section,
  text,
}: {
  section: JackpotSection;
  text: (value: JackpotSection["title"]) => string;
}) {
  const Icon = ICON_COMPONENTS[section.icon];
  const eyebrow = text(section.eyebrow);
  const title = text(section.title);
  const badge = text(section.badge);
  return (
    <div
      data-xp-edit="sections.jackpot"
      className="xp-breathe flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--xp-radius-lg)] border px-3 py-2"
      style={{
        background: `linear-gradient(135deg, ${tint("--xp-primary", 18)}, ${tint("--xp-primary", 6)})`,
        borderColor: tint("--xp-primary", 45),
        boxShadow: `0 0.5rem 1.25rem -0.4rem ${tint("--xp-primary", 35)}`,
      }}
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-[var(--xp-radius-md)]"
        style={{
          background:
            "linear-gradient(135deg, var(--xp-primary-light), var(--xp-primary) 55%, var(--xp-primary-deep))",
          color: "var(--xp-on-primary)",
          boxShadow: `0 0.3rem 0.7rem -0.2rem ${tint("--xp-primary", 55)}`,
        }}
      >
        <Icon className="size-[55%]" strokeWidth={2.5} />
      </span>
      <div className="flex min-w-0 flex-[1_1_9rem] flex-col">
        {eyebrow && (
          <p
            dir="auto"
            data-xp-clamp
            className={`flex min-w-0 items-center gap-1 text-[0.65rem] font-extrabold ${spacedCaps(eyebrow, "uppercase tracking-[0.14em]")}`}
            style={{ color: BRAND_INK }}
          >
            <span className="truncate">{eyebrow}</span>
            <Sparkles
              aria-hidden
              className="xp-wiggle size-3 shrink-0"
              strokeWidth={2.5}
            />
          </p>
        )}
        {title && (
          <p
            dir="auto"
            data-xp-clamp
            className="line-clamp-2 text-[0.85rem] leading-tight font-extrabold wrap-anywhere"
          >
            {title}
          </p>
        )}
      </div>
      {badge && (
        <span
          dir="auto"
          data-xp-clamp
          className={`ms-auto max-w-full shrink-0 truncate rounded-[var(--xp-radius-sm)] border px-2 py-0.5 text-[0.65rem] font-extrabold ${spacedCaps(badge, "uppercase tracking-[0.06em]")}`}
          style={{
            color: BRAND_INK,
            backgroundColor: tint("--xp-primary", 18),
            borderColor: tint("--xp-primary", 40),
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
