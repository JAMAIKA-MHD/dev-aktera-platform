import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { getDirection, resolveText, type Locale } from "../../domain/locale";
import type { ExperienceConfig, ScreenContent } from "../../domain/types";
import { FRAME_TEXT } from "../../presets/contentDefaults";
import { runtimeAudio, unlockOnFirstGesture } from "../feedback/audio";
import { useLayoutMode } from "../layout/useLayoutMode";
import { TermsSheet } from "../legal/TermsSheet";
import { JackpotCard } from "../sections/JackpotCard";
import { PrizeChips } from "../sections/PrizeChips";
import { BrandHeaderSlot } from "./slots/BrandHeaderSlot";
import { CtaSlot } from "./slots/CtaSlot";
import { FooterSlot } from "./slots/FooterSlot";
import { HeroVisualSlot } from "./slots/HeroVisualSlot";
import { PrimaryInteractionSlot } from "./slots/PrimaryInteractionSlot";
import {
  ReinforcementSlot,
  type ReinforcementProgress,
} from "./slots/ReinforcementSlot";
import { SupportingCopySlot } from "./slots/SupportingCopySlot";
import { TitleSlot } from "./slots/TitleSlot";
import { StatusBadge } from "./StatusBadge";

// The 8-slot frame of every player screen (plan §8.3, prototype SlotContainer). It receives
// content and actions, never layout callbacks: the layout is code (frame.css), and the
// brand fills the slots without positioning anything.
//
// The DOM is the same in every arrangement: frame.css moves the slots from one column
// (stack) to two panes (split) with the variants of layout.css, so a rotation or a preview
// resize never remounts the game of slot 5. useLayoutMode() gives the same mode to the
// code, for what the layout decides itself (the hero is dropped when the screen is low).

// Actions of slot 7, from the flow state machine; the labels come from the screen content.
export interface CtaActions {
  onPrimary: () => void;
  onSecondary?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

// Live values of slot 6, from the game: the configured text wins when there is one.
export interface ReinforcementLive {
  text?: string; // e.g. a countdown
  progress?: ReinforcementProgress | null;
}

export interface ExperienceFrameProps {
  config: ExperienceConfig;
  locale: Locale;
  screenContent: ScreenContent;
  editPath?: string | null; // "screens.welcome": the Studio opens the matching field on click
  logoUrl?: string | null; // brand.logo resolved by the caller (AssetStorage.resolveUrl)
  statusBadge?: string | null; // "Demo" while the participation gateway is not live (B6)
  live?: boolean; // pulsing dot of the header: the campaign is running
  showSections?: boolean; // welcome screen: jackpot card and prize chips (plan §8.4)
  children?: ReactNode; // slot 5: screen body or game engine
  reinforcement?: ReinforcementLive; // slot 6
  cta?: CtaActions | null; // slot 7: none while the screen waits (resolving)
}

export function ExperienceFrame({
  config,
  locale,
  screenContent,
  editPath = null,
  logoUrl = null,
  statusBadge = null,
  live = true,
  showSections = false,
  children,
  reinforcement,
  cta = null,
}: ExperienceFrameProps) {
  const mode = useLayoutMode();
  // Sounds wait for the player's first gesture (autoplay rules), then follow features.sound.
  useEffect(() => unlockOnFirstGesture(document, runtimeAudio), []);
  useEffect(() => {
    runtimeAudio.setEnabled(config.features.sound);
  }, [config.features.sound]);
  // The legal sheet is open while it knows its trigger, where the focus goes back.
  const [sheetTrigger, setSheetTrigger] = useState<HTMLElement | null>(null);
  const fallback = config.locales.default;
  const text = (value: ScreenContent["title"] | null | undefined) =>
    value ? resolveText(value, locale, fallback) : "";
  const direction = getDirection(locale);
  const title = text(screenContent.title);
  const subtitle = text(screenContent.subtitle);
  // Low screens keep their height for the game and the CTA (plan §8.3, tight density).
  const hero =
    screenContent.hero !== "none" && mode.density !== "tight"
      ? screenContent.hero
      : null;
  const reinforcementKind = screenContent.reinforcement.kind;
  const reinforcementText =
    text(screenContent.reinforcement.text) || reinforcement?.text || "";
  const primaryLabel = text(screenContent.primaryCta);
  const { jackpot, prizeChips } = config.sections;
  const organizer = config.legal.organizerName.trim();

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
      <PrimaryInteractionSlot>{children}</PrimaryInteractionSlot>
      {/* Under the game in stack; in split, under the copy: the end pane is the game's. */}
      {showSections && (jackpot.enabled || prizeChips.enabled) && (
        <div
          data-xp-slot="sections"
          data-xp-rise
          style={{ "--xp-rise-order": 4 } as CSSProperties}
        >
          {jackpot.enabled && <JackpotCard section={jackpot} text={text} />}
          {prizeChips.enabled && (
            <PrizeChips section={prizeChips} text={text} />
          )}
        </div>
      )}
      {reinforcementKind !== "none" &&
        (reinforcementText || reinforcement?.progress) && (
          <ReinforcementSlot
            kind={reinforcementKind}
            text={reinforcementText}
            progress={reinforcement?.progress ?? null}
            editPath={editPath}
          />
        )}
      {cta && primaryLabel && (
        <CtaSlot
          primaryLabel={primaryLabel}
          secondaryLabel={text(screenContent.secondaryCta) || null}
          onPrimary={() => {
            runtimeAudio.play("click");
            cta.onPrimary();
          }}
          onSecondary={
            cta.onSecondary &&
            (() => {
              runtimeAudio.play("click");
              cta.onSecondary?.();
            })
          }
          disabled={cta.disabled ?? false}
          loading={cta.loading ?? false}
          loadingLabel={text(FRAME_TEXT.loading)}
          editPath={editPath}
        />
      )}
      <FooterSlot
        legal={config.legal}
        locale={locale}
        fallbackLocale={fallback}
        direction={direction}
        onOpenSheet={setSheetTrigger}
      />
      {/* Fixed, outside the slots: no transformed ancestor can trap it. */}
      {sheetTrigger && (
        <TermsSheet
          title={text(FRAME_TEXT.legalTitle)}
          organizer={
            organizer
              ? text(FRAME_TEXT.organizedBy).replace("{name}", organizer)
              : null
          }
          body={text(config.legal.termsBody)}
          closeLabel={text(FRAME_TEXT.close)}
          returnFocusTo={sheetTrigger}
          onClose={() => setSheetTrigger(null)}
        />
      )}
    </div>
  );
}
