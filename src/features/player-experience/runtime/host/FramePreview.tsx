import type { ReactNode } from "react";
import { resolveText, type Locale } from "../../domain/locale";
import type { ExperienceConfig, ScreenKey } from "../../domain/types";
import { tint } from "../../theme/recipes";
import { ExperienceFrame } from "../frame/ExperienceFrame";

// Frame fixtures of /xp-frame: the real frame with its slots 1 to 4, and outlined stand-ins
// where the next tasks plug their content (game and screens: phases 4 and 5; reinforcement
// and CTA: T3.5). The stand-ins only show the zones, so the layout can be checked now.

const EYEBROW =
  "text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--xp-text-muted)]";

function StandIn({
  label,
  detail,
  className,
}: {
  label: string;
  detail: ReactNode;
  className: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 border border-dashed p-3 text-center ${className}`}
      style={{
        borderColor: tint("--xp-primary", 40),
        background: `radial-gradient(ellipse at 50% 45%, ${tint("--xp-primary", 16)}, transparent 70%)`,
      }}
    >
      <p className={EYEBROW}>{label}</p>
      <p dir="auto" className="text-sm font-semibold wrap-anywhere">
        {detail}
      </p>
    </div>
  );
}

export function FramePreview({
  config,
  locale,
  screen,
  logoUrl,
}: {
  config: ExperienceConfig;
  locale: Locale;
  screen: ScreenKey;
  logoUrl: string | null;
}) {
  const content = config.screens[screen];
  const cta = resolveText(content.primaryCta, locale, config.locales.default);
  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={content}
      editPath={`screens.${screen}`}
      logoUrl={logoUrl}
      statusBadge="Demo"
      cta={
        <StandIn
          label="Slot 7 · CTA"
          detail={cta}
          className="min-h-[52px] rounded-[var(--xp-radius-pill)]"
        />
      }
    >
      {/* The floor of the game zone (--xp-game-min, T3.5): below it, the page scrolls. */}
      <StandIn
        label="Slot 5 · Game zone"
        detail={screen}
        className="h-full min-h-[12.5rem] rounded-[var(--xp-radius-lg)]"
      />
    </ExperienceFrame>
  );
}
