import type { Locale } from "../../domain/locale";
import type { ExperienceConfig, ScreenKey } from "../../domain/types";
import { tint } from "../../theme/recipes";
import {
  ExperienceFrame,
  type ReinforcementLive,
} from "../frame/ExperienceFrame";

// Frame fixtures of /xp-frame: the real frame and its 8 slots. Slot 5 holds an outlined
// stand-in until the screens (phase 4) and the games (phase 5) exist. The buttons do
// nothing: the flow state machine plugs in with PlayerExperience (T4.1).

export interface FramePreviewState {
  reinforcement?: ReinforcementLive;
  cta?: { disabled?: boolean; loading?: boolean };
}

const noop = () => {};

export function FramePreview({
  config,
  locale,
  screen,
  logoUrl,
  state = {},
}: {
  config: ExperienceConfig;
  locale: Locale;
  screen: ScreenKey;
  logoUrl: string | null;
  state?: FramePreviewState;
}) {
  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={config.screens[screen]}
      editPath={`screens.${screen}`}
      logoUrl={logoUrl}
      statusBadge="Demo"
      reinforcement={state.reinforcement}
      cta={{ onPrimary: noop, onSecondary: noop, ...state.cta }}
    >
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-[var(--xp-radius-lg)] border border-dashed p-3 text-center"
        style={{
          borderColor: tint("--xp-primary", 40),
          background: `radial-gradient(ellipse at 50% 45%, ${tint("--xp-primary", 16)}, transparent 70%)`,
        }}
      >
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--xp-text-muted)]">
          Slot 5 · Game zone
        </p>
        <p className="text-sm font-semibold">{screen}</p>
      </div>
    </ExperienceFrame>
  );
}
