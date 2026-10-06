import { useSyncExternalStore } from "react";
import type { Locale } from "../../domain/locale";
import { THEME_PRESETS, themeFromPreset } from "../../presets/themePresets";
import { cardStyle, primaryButtonStyle, tint } from "../../theme/recipes";
import { ThemeScope } from "../../theme/ThemeScope";
import { describeLayoutMode } from "../layout/layoutMode";
import { useLayoutMode } from "../layout/useLayoutMode";

// Control views of /xp-frame (fixtures layout-debug and theme-presets). They are what the
// responsive sweep and a reviewer look at, so they use the same tokens as the real screens.

const SWATCHES = [
  ["Primary", "--xp-primary"],
  ["Secondary", "--xp-secondary"],
  ["Accent", "--xp-accent"],
  ["Surface", "--xp-surface"],
  ["Text", "--xp-text"],
  ["Muted", "--xp-text-muted"],
] as const;

const subscribeToResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const readViewport = () => `${window.innerWidth} × ${window.innerHeight}`;

// Safe-area aware page padding, shared by both views.
const PAGE =
  "flex flex-1 flex-col gap-4 tight:gap-2 pt-[max(1rem,var(--xp-safe-top))] pb-[max(1rem,var(--xp-safe-bottom))] pl-[max(1rem,var(--xp-safe-left))] pr-[max(1rem,var(--xp-safe-right))]";
const EYEBROW =
  "text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--xp-text-muted)]";

function Swatch({ label, variable }: { label: string; variable: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="size-6 shrink-0 rounded-full border"
        style={{
          background: `var(${variable})`,
          borderColor: tint("--xp-text", 20),
        }}
      />
      <span className="min-w-0 truncate text-xs text-[var(--xp-text-muted)]">
        {label}
      </span>
    </div>
  );
}

export function LayoutDebugView() {
  const mode = useLayoutMode();
  const viewport = useSyncExternalStore(subscribeToResize, readViewport);
  return (
    <main className={PAGE}>
      <header className="flex flex-col gap-1">
        <p className={EYEBROW}>Layout debug</p>
        <p
          data-testid="layout-mode"
          className="text-[clamp(1.4rem,min(7vw,8vh),3rem)] font-black leading-tight tracking-tight"
        >
          {describeLayoutMode(mode)}
        </p>
        <p className="text-sm text-[var(--xp-text-muted)]">{viewport}</p>
      </header>

      {/* Two panes in split, one column in stack: the arrangement of the real frame. */}
      <section className="flex flex-1 flex-col gap-3 split:flex-row">
        <div
          className="flex flex-col justify-center gap-1 border p-4 split:w-2/5"
          style={cardStyle}
        >
          <p className={EYEBROW}>Left pane</p>
          <p className="font-bold">Slots 1–4, 6–7</p>
          <p className="text-sm text-[var(--xp-text-muted)]">
            Brand, title, copy, reinforcement and CTA
          </p>
        </div>
        <div
          className="flex flex-1 flex-col items-center justify-center gap-1 border p-4"
          style={{ ...cardStyle, borderColor: tint("--xp-primary", 45) }}
        >
          <p className={EYEBROW}>Game zone</p>
          <p className="font-bold">Slot 5</p>
        </div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,7rem),1fr))] gap-3">
        {SWATCHES.map(([label, variable]) => (
          <Swatch key={variable} label={label} variable={variable} />
        ))}
      </section>
    </main>
  );
}

export function ThemePresetsView({ locale }: { locale: Locale }) {
  return (
    <main className={PAGE}>
      <header className="flex flex-col gap-1">
        <p className={EYEBROW}>Theme presets</p>
        <h1 className="text-[clamp(1.4rem,min(6vw,7vh),2.5rem)] font-black leading-tight tracking-tight">
          Five styles, one set of tokens
        </h1>
      </header>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-4">
        {THEME_PRESETS.map((preset) => (
          <ThemeScope
            key={preset.id}
            theme={themeFromPreset(preset.id)}
            locale={locale}
            className="flex flex-col gap-3 overflow-hidden rounded-[var(--xp-radius-lg)] border border-[color-mix(in_srgb,var(--xp-text)_12%,transparent)] p-5 shadow-lg"
          >
            <p className={EYEBROW}>{preset.label}</p>
            <p
              dir="auto"
              className="text-xl font-black leading-tight tracking-tight"
            >
              Tentez votre chance
            </p>
            <p dir="auto" className="text-sm text-[var(--xp-text-muted)]">
              Texte secondaire lisible sur chaque fond.
            </p>
            <button
              type="button"
              className="min-h-[48px] px-5 text-sm font-black uppercase tracking-wide"
              style={primaryButtonStyle}
            >
              Lancer le jeu
            </button>
            <div className="flex gap-2">
              {SWATCHES.slice(0, 5).map(([label, variable]) => (
                <span
                  key={variable}
                  title={label}
                  className="size-5 rounded-full border"
                  style={{
                    background: `var(${variable})`,
                    borderColor: tint("--xp-text", 20),
                  }}
                />
              ))}
            </div>
          </ThemeScope>
        ))}
      </div>
    </main>
  );
}
