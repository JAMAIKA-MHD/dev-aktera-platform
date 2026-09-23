import { useEffect, useMemo, type ReactNode } from "react";
import type { CampaignSnapshot } from "../../domain/campaign";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig, ScreenKey } from "../../domain/types";
import { createLocalServices } from "../../services/createLocalServices";
import type { ExperienceServices } from "../../services/ports";
import { ensureFontStylesheet } from "../../theme/fonts";
import { ThemeScope } from "../../theme/ThemeScope";
import { StatusBadge } from "../frame/StatusBadge";
import { safeAreaStyle, type SafeAreaInsets } from "../layout/safeArea";
import { LayoutDebugView, ThemePresetsView } from "./DebugViews";
import { FeedbackDebugView } from "./FeedbackDebugView";
import { FramePreview, type FramePreviewState } from "./FramePreview";
import { AllGamesView } from "./AllGamesView";
import type { FixtureView } from "./fixtures";

// What /xp-frame draws, whatever the source of its configuration (FrameHost.tsx).

// One set of demo services for the whole frame (the journey will use them from T4.1).
let services: ExperienceServices | null = null;
export const frameServices = () => (services ??= createLocalServices());

export interface FrameContent {
  config: ExperienceConfig;
  campaign: CampaignSnapshot;
  locale: Locale;
  view: FixtureView;
  screen: ScreenKey; // drawn by the frame view
  state?: FramePreviewState;
  safeArea?: SafeAreaInsets;
}

// Until the player journey exists (T4.1), the frame shows the control views. The frame
// view carries the DEMO badge in its header; the other views get a floating one.
export function Stage({ content }: { content: FrameContent }) {
  const { config, locale, view, safeArea } = content;
  const { assets } = frameServices();
  const imageUrl = useMemo(
    () => assets.resolveUrl(config.theme.background.image),
    [assets, config.theme.background.image],
  );
  const logoUrl = useMemo(
    () => assets.resolveUrl(config.brand.logo),
    [assets, config.brand.logo],
  );
  useEffect(() => {
    ensureFontStylesheet(document, config.theme.font);
  }, [config.theme.font]);
  return (
    <div style={safeAreaStyle(safeArea ?? null)}>
      <ThemeScope
        theme={config.theme}
        locale={locale}
        imageUrl={imageUrl}
        className="xp-runtime flex flex-col"
      >
        {view === "frame" ? (
          <FramePreview
            config={config}
            locale={locale}
            screen={content.screen}
            state={content.state}
            logoUrl={logoUrl}
          />
        ) : (
          <>
            {view === "theme-presets" ? (
              <ThemePresetsView locale={locale} />
            ) : view === "feedback-debug" ? (
              <FeedbackDebugView config={config} />
            ) : view === "all-games" ? (
              <AllGamesView locale={locale} />
            ) : (
              <LayoutDebugView />
            )}
            <StatusBadge label="Demo" floating />
          </>
        )}
      </ThemeScope>
    </div>
  );
}

export function Message({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <main className="xp-runtime flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-bold">{title}</p>
      {children}
    </main>
  );
}
