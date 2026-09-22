import type { CSSProperties, ReactNode } from "react";
import { getDirection, resolveText, type Locale } from "../../domain/locale";
import type { ExperienceConfig, ScreenContent } from "../../domain/types";
import { useLayoutMode } from "../layout/useLayoutMode";
import { BrandHeaderSlot } from "./slots/BrandHeaderSlot";
import { HeroVisualSlot } from "./slots/HeroVisualSlot";
import { SupportingCopySlot } from "./slots/SupportingCopySlot";
import { TitleSlot } from "./slots/TitleSlot";
import { StatusBadge } from "./StatusBadge";

// The 8-slot frame of every player screen (plan §8.3, prototype SlotContainer). It receives
// content only, never layout callbacks: the layout is code (frame.css), and the brand
// fills the slots without positioning anything.
//
// The DOM is the same in every arrangement: frame.css moves the slots from one column
// (stack) to two panes (split) with the variants of layout.css, so a rotation or a preview
// resize never remounts the game of slot 5. useLayoutMode() gives the same mode to the
// code, for what the layout decides itself (the hero is dropped when the screen is low).

export interface ExperienceFrameProps {
  config: ExperienceConfig;
  locale: Locale;
  screenContent: ScreenContent;
  editPath?: string | null; // "screens.welcome": the Studio opens the matching field on click
  logoUrl?: string | null; // brand.logo resolved by the caller (AssetStorage.resolveUrl)
  statusBadge?: string | null; // "Demo" while the participation gateway is not live (B6)
  live?: boolean; // pulsing dot of the header: the campaign is running
  children?: ReactNode; // slot 5: screen body or game engine
  reinforcement?: ReactNode; // slot 6
  cta?: ReactNode; // slot 7
}

function Zone({
  slot,
  order,
  children,
}: {
  slot: string;
  order: number;
  children: ReactNode;
}) {
  return (
    <div
      data-xp-slot={slot}
      data-xp-rise
      style={{ "--xp-rise-order": order } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function ExperienceFrame({
  config,
  locale,
  screenContent,
  editPath = null,
  logoUrl = null,
  statusBadge = null,
  live = true,
  children,
  reinforcement,
  cta,
}: ExperienceFrameProps) {
  const mode = useLayoutMode();
  const fallback = config.locales.default;
  const direction = getDirection(locale);
  const title = resolveText(screenContent.title, locale, fallback);
  const subtitle = resolveText(screenContent.subtitle, locale, fallback);
  // Low screens keep their height for the game and the CTA (plan §8.3, tight density).
  const hero =
    screenContent.hero !== "none" && mode.density !== "tight"
      ? screenContent.hero
      : null;

  return (
    <div
      className="xp-frame"
      data-xp-arrangement={mode.arrangement}
      data-xp-density={mode.density}
      data-xp-motion={config.features.animations ? undefined : "off"}
    >
      {screenContent.showHeader ? (
        <BrandHeaderSlot
          brand={config.brand}
          locale={locale}
          fallbackLocale={fallback}
          logoUrl={logoUrl}
          live={live}
          badge={statusBadge}
        />
      ) : (
        // Without the header, the badge keeps a row of its own: it never covers the title.
        statusBadge && (
          <div data-xp-slot="status" className="flex justify-end">
            <StatusBadge label={statusBadge} />
          </div>
        )
      )}
      {hero && <HeroVisualSlot hero={hero} editPath={editPath} />}
      {title && (
        <TitleSlot text={title} direction={direction} editPath={editPath} />
      )}
      {subtitle && (
        <SupportingCopySlot
          text={subtitle}
          direction={direction}
          editPath={editPath}
        />
      )}
      <Zone slot="interaction" order={3}>
        {children}
      </Zone>
      {reinforcement && (
        <Zone slot="reinforcement" order={4}>
          {reinforcement}
        </Zone>
      )}
      {cta && (
        <Zone slot="cta" order={5}>
          {cta}
        </Zone>
      )}
    </div>
  );
}
