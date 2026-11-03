import { Check, Moon, RotateCcw, Sun } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { TemplateId } from "../../domain/templates";
import type { ThemeTokens } from "../../domain/types";
import {
  EXPERIENCE_TEMPLATES,
  getTemplate,
  type ExperienceTemplate,
} from "../../presets/templates";
import {
  STYLE_PRESETS,
  findPreset,
  themeFromPreset,
  type ThemePreset,
} from "../../presets/themePresets";
import { getThemeManifest } from "../../presets/themeManifests";
import { themePalette } from "../../theme/shellVars";
import { raysGradient } from "../../theme/stagePaint";
import { resolveThemeAssets } from "../../theme/themeAssets";
import { useStudio } from "../StudioContext";
import { PanelBody, PanelHeader, PanelSection } from "./PanelLayout";

// Template (plan §9.2): the template library and, for the classic template, the style
// presets. A template is picked here and only here (the configuration accepts no other
// value, and save_experience_config refuses one): it dresses every screen — stage, panel,
// fonts, buttons, fields, game — on the same 8-slot layout, with its own palette. Picking a
// template or a preset never touches the brand's texts. When the brand has already changed
// the style, it asks first: those changes would be lost. Thumbnails are drawn from the
// template's own theme.json (background, panel frame, fonts, button), not by rendering the
// runtime.

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

// ── Template thumbnails: the theme's own background, panel frame and button ──

// A miniature built from the template's theme.json itself: its background for the game, its
// panel (its shape, or its 9-slice frame), a title in its display font and its button — the very files and
// tokens the player screens use, so a thumbnail can never drift from the template.
function ThemeThumbnail({ templateId }: { templateId: TemplateId }) {
  const manifest = getThemeManifest(templateId);
  if (!manifest) return null;
  const assets = resolveThemeAssets(manifest);
  const background = assets.background("lucky_wheel", undefined);
  const palette = themePalette(manifest, null);
  const role = (value: string) =>
    value.replace(
      /@([a-z-]+)/g,
      (match, name: string) => palette[name] ?? match,
    );
  // A painted stage: the sky inside its frame (or its own), in the theme's rays.
  const paint = manifest.stage.frame?.sky ?? manifest.stage.paint?.sky;
  const stageImage = paint
    ? raysGradient(paint, role)
    : background
      ? `url("${background}")`
      : undefined;
  const frame = manifest.panel.frame;
  const panel: CSSProperties = assets.panelShape
    ? {
        background: `url("${assets.panelShape}") center / 100% 100% no-repeat`,
        padding: "0.6rem 1.1rem",
      }
    : assets.panelFrame && frame
      ? {
          borderStyle: "solid",
          borderWidth: `calc(${frame.width} * 0.45)`,
          borderImage: `url("${assets.panelFrame}") ${frame.slice} fill / calc(${frame.width} * 0.45) stretch`,
        }
      : {
          backgroundColor: role(manifest.panel.bg),
          border: `2px solid ${role(manifest.panel.border)}`,
          borderRadius: 10,
        };
  const button = manifest.button.primary;
  return (
    <div
      aria-hidden
      className="relative flex h-24 items-center justify-center overflow-hidden rounded-xl"
      style={{
        backgroundColor: manifest.stage.color,
        backgroundImage: stageImage,
        backgroundSize:
          manifest.stage.fit === "stretch" ? "100% 100%" : "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="flex w-3/5 flex-col items-center gap-1 px-2 py-1.5"
        style={panel}
      >
        <span
          className="max-w-full truncate text-[10px] leading-none"
          style={{
            fontFamily: `"${manifest.fonts.display}", sans-serif`,
            color: role(manifest.title.color),
            textTransform: manifest.title.transform,
            WebkitTextStroke: manifest.title.stroke
              ? `2px ${role(manifest.title.stroke)}`
              : undefined,
            paintOrder: "stroke fill",
          }}
        >
          {manifest.label}
        </span>
        <span
          className="h-3 w-4/5"
          style={{
            background: role(button.bg),
            border: `1.5px solid ${role(button.border)}`,
            borderRadius: manifest.tokens.radius.pill === "0" ? 0 : 999,
            boxShadow: `0 2px 0 ${role(button.border)}`,
          }}
        />
      </div>
    </div>
  );
}

function TemplateThumbnail({
  template,
  classicPreset,
}: {
  template: ExperienceTemplate;
  classicPreset: ThemePreset;
}) {
  return template.presetId === null ? (
    <PresetThumbnail preset={classicPreset} />
  ) : (
    <ThemeThumbnail templateId={template.id} />
  );
}

function SelectedMark() {
  return (
    <span className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
      <Check className="size-3.5" strokeWidth={3} aria-hidden />
    </span>
  );
}

const CARD =
  "group relative rounded-2xl border bg-card-bg p-2 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-blue-500";
const CARD_STATE = (selected: boolean) =>
  selected
    ? "border-blue-500 ring-4 ring-blue-500/15"
    : "border-card-border hover:border-slate-300 dark:hover:border-slate-600";

function TemplateCard({
  template,
  classicPreset,
  selected,
  onSelect,
}: {
  template: ExperienceTemplate;
  classicPreset: ThemePreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const mode = findPreset(template.presetId)?.tokens.mode;
  const ModeIcon = mode === "light" ? Sun : Moon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-describedby={`template-${template.id}-description`}
      onClick={onSelect}
      className={`${CARD} ${CARD_STATE(selected)}`}
    >
      <TemplateThumbnail template={template} classicPreset={classicPreset} />
      <div className="mt-2 flex items-center gap-1.5 px-1">
        <span className="flex-1 truncate text-sm font-bold text-brand-text">
          {template.label}
        </span>
        {mode && (
          <ModeIcon
            className="size-3.5 text-brand-text-muted"
            aria-label={mode}
          />
        )}
      </div>
      <p
        id={`template-${template.id}-description`}
        className="mt-1 line-clamp-3 px-1 pb-1 text-xs leading-snug text-brand-text-muted"
      >
        {template.description}
      </p>
      {selected && <SelectedMark />}
    </button>
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
      className={`${CARD} ${CARD_STATE(selected)}`}
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
      {selected && <SelectedMark />}
    </button>
  );
}

// What a click asks to apply, held while the brand confirms losing its style changes.
type Pending =
  | { kind: "template"; template: ExperienceTemplate }
  | { kind: "preset"; preset: ThemePreset };

export function TemplatePanel() {
  const theme = useStudio((state) => state.config.theme);
  const templateId = useStudio((state) => state.config.templateId);
  const applyPreset = useStudio((state) => state.applyPreset);
  const applyTemplate = useStudio((state) => state.applyTemplate);
  const [pending, setPending] = useState<Pending | null>(null);
  const customized = isCustomized(theme);
  const template = getTemplate(templateId);
  const classic = template.presetId === null;
  const current = findPreset(theme.presetId);
  // The classic thumbnail shows the classic style the brand would get back.
  const classicPreset =
    current && !current.template
      ? current
      : (STYLE_PRESETS.find((preset) => preset.id === "midnight-gold") ??
        STYLE_PRESETS[0]);

  const apply = (next: Pending) =>
    next.kind === "template"
      ? applyTemplate(next.template.id)
      : applyPreset(next.preset.id);

  const chooseTemplate = (next: ExperienceTemplate) => {
    if (next.id === templateId) return;
    // Back to the classic layout keeps the style; any other template replaces it.
    const replacesStyle = next.presetId !== null || current?.template;
    if (customized && replacesStyle)
      setPending({ kind: "template", template: next });
    else applyTemplate(next.id);
  };
  const choosePreset = (preset: ThemePreset) => {
    if (preset.id === theme.presetId && !customized) return;
    if (customized) setPending({ kind: "preset", preset });
    else applyPreset(preset.id);
  };
  const pendingLabel =
    pending?.kind === "template"
      ? pending.template.label
      : pending?.preset.label;

  return (
    <>
      <PanelHeader
        title="Theme"
        description="The look of every screen. Pick one from the library, then make it yours in Brand."
      />
      <PanelBody>
        <PanelSection
          title="Theme library"
          description="Each theme dresses the welcome, form, game and result screens, on every screen size. Your texts are kept."
        >
          <div
            role="radiogroup"
            aria-label="Theme library"
            className="grid grid-cols-2 gap-3"
          >
            {EXPERIENCE_TEMPLATES.map((candidate) => (
              <TemplateCard
                key={candidate.id}
                template={candidate}
                classicPreset={classicPreset}
                selected={candidate.id === templateId}
                onSelect={() => chooseTemplate(candidate)}
              />
            ))}
          </div>
        </PanelSection>

        {pending && (
          <div
            role="alertdialog"
            aria-label="Replace your style changes?"
            className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <p>
              <strong>{pendingLabel}</strong> will replace the colors,
              background, corners and font you changed. Your texts stay as they
              are.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => {
                  apply(pending);
                  setPending(null);
                }}
                className="min-h-10 rounded-xl bg-amber-500 px-4 text-xs font-bold text-amber-950 transition hover:bg-amber-400 active:scale-95"
              >
                Apply {pendingLabel}
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

        <PanelSection
          title="Style"
          description={
            classic
              ? "Colors, background, corners and font. Your texts are kept."
              : `${template.label} comes with its own colors and fonts. Fine-tune the colors in Brand.`
          }
        >
          {classic && (
            <div
              role="radiogroup"
              aria-label="Style presets"
              className="grid grid-cols-2 gap-3"
            >
              {STYLE_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  selected={preset.id === theme.presetId}
                  onSelect={() => choosePreset(preset)}
                />
              ))}
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
              : classic
                ? "Reset to preset"
                : `Reset to ${template.label} colors`}
          </button>
          <p className="text-xs text-brand-text-muted">
            Undo (Ctrl+Z) brings back the previous style at any time.
          </p>
        </PanelSection>
      </PanelBody>
    </>
  );
}
