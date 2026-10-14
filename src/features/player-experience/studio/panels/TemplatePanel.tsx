import { Check, Moon, RotateCcw, Sun } from "lucide-react";
import { useState } from "react";
import type { ThemeTokens } from "../../domain/types";
import {
  THEME_PRESETS,
  themeFromPreset,
  type ThemePreset,
} from "../../presets/themePresets";
import { useStudio } from "../StudioContext";
import { PanelBody, PanelHeader, PanelSection } from "./PanelLayout";

// Template (plan §9.2): the style presets (the layout is one in the MVP, so nothing to choose). A preset replaces
// the style only — colors, background, corners, font — never the brand's texts. When the brand
// has already changed the style, applying another preset asks first: those changes would be
// lost. Thumbnails are drawn from the preset's colors, not by rendering the runtime.

export function isCustomized(theme: ThemeTokens): boolean {
  if (!theme.presetId) return true;
  const { presetId: _preset, ...current } = theme;
  const { presetId: _original, ...original } = themeFromPreset(theme.presetId);
  return JSON.stringify(current) !== JSON.stringify(original);
}

const RADIUS = { sharp: 4, rounded: 10, pill: 999 } as const;

function PresetThumbnail({ preset }: { preset: ThemePreset }) {
  const { colors, radius } = preset.tokens;
  return (
    <div
      aria-hidden
      className="relative flex h-24 flex-col items-center justify-end gap-1.5 overflow-hidden rounded-xl p-2.5"
      style={{
        backgroundColor: colors.surface,
        backgroundImage: `radial-gradient(circle at 25% 15%, ${colors.primary}40, transparent 55%), radial-gradient(circle at 85% 85%, ${colors.secondary}30, transparent 50%)`,
      }}
    >
      <span
        className="absolute top-3 size-9 rounded-full"
        style={{
          background: `conic-gradient(${colors.primary} 0 25%, ${colors.secondary} 0 50%, ${colors.primary} 0 75%, ${colors.accent} 0)`,
          boxShadow: `0 6px 16px ${colors.primary}55`,
        }}
      />
      <span
        className="h-1.5 w-3/5 rounded-full opacity-80"
        style={{ backgroundColor: colors.text }}
      />
      <span
        className="h-4 w-4/5"
        style={{
          backgroundColor: colors.primary,
          borderRadius: RADIUS[radius],
        }}
      />
    </div>
  );
}

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: ThemePreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const { mode, colors } = preset.tokens;
  const ModeIcon = mode === "dark" ? Moon : Sun;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group relative rounded-2xl border bg-card-bg p-2 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-blue-500 ${
        selected
          ? "border-blue-500 ring-4 ring-blue-500/15"
          : "border-card-border hover:border-slate-300 dark:hover:border-slate-600"
      }`}
    >
      <PresetThumbnail preset={preset} />
      <div className="mt-2 flex items-center gap-1.5 px-1">
        <span className="flex-1 truncate text-sm font-bold text-brand-text">
          {preset.label}
        </span>
        <ModeIcon
          className="size-3.5 text-brand-text-muted"
          aria-label={mode}
        />
      </div>
      <div className="mt-1.5 flex gap-1 px-1 pb-1" aria-hidden>
        {Object.values(colors).map((color, index) => (
          <span
            key={index}
            className="size-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/15"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      {selected && (
        <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
      )}
    </button>
  );
}

export function TemplatePanel() {
  const theme = useStudio((state) => state.config.theme);
  const applyPreset = useStudio((state) => state.applyPreset);
  const [pending, setPending] = useState<ThemePreset | null>(null);
  const customized = isCustomized(theme);
  const current = THEME_PRESETS.find((preset) => preset.id === theme.presetId);

  const choose = (preset: ThemePreset) => {
    if (preset.id === theme.presetId && !customized) return;
    if (customized) setPending(preset);
    else applyPreset(preset.id);
  };

  return (
    <>
      <PanelHeader
        title="Template"
        description="The starting style of every screen. Pick one, then make it yours in Brand."
      />
      <PanelBody>
        <PanelSection
          title="Style"
          description="Colors, background, corners and font. Your texts are kept."
        >
          <div
            role="radiogroup"
            aria-label="Style presets"
            className="grid grid-cols-2 gap-3"
          >
            {THEME_PRESETS.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                selected={preset.id === theme.presetId}
                onSelect={() => choose(preset)}
              />
            ))}
          </div>

          {pending && (
            <div
              role="alertdialog"
              aria-label="Replace your style changes?"
              className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
            >
              <p>
                <strong>{pending.label}</strong> will replace the colors,
                background, corners and font you changed. Your texts stay as
                they are.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    applyPreset(pending.id);
                    setPending(null);
                  }}
                  className="min-h-10 rounded-xl bg-amber-500 px-4 text-xs font-bold text-amber-950 transition hover:bg-amber-400 active:scale-95"
                >
                  Apply {pending.label}
                </button>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="min-h-10 rounded-xl px-4 text-xs font-bold transition hover:bg-amber-100 active:scale-95 dark:hover:bg-amber-500/20"
                >
                  Keep my changes
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!customized || !current}
            onClick={() => current && applyPreset(current.id)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-card-border text-sm font-bold text-brand-text transition hover:bg-card-hover active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
          >
            <RotateCcw className="size-4" aria-hidden />
            {customized && current
              ? `Reset to ${current.label}`
              : "Reset to preset"}
          </button>
          <p className="text-xs text-brand-text-muted">
            Undo (Ctrl+Z) brings back the previous style at any time.
          </p>
        </PanelSection>
      </PanelBody>
    </>
  );
}
