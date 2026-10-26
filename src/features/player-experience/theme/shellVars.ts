import { contrastRatio } from "../domain/contrast";
import type { ThemeManifest, ThemeScreen } from "../domain/themeManifest";
import type { ThemeTokens } from "../domain/types";
import { templateFontStack } from "./fonts";
import { resolveThemeAssets, type ThemeAssets } from "./themeAssets";
import { mixHex, type CssVars } from "./tokens";

// A theme.json → the CSS variables of the shell (runtime/shell/), set on the runtime root by
// ThemeScope. The shell's components read these and nothing else; each one falls back to the
// classic look when no theme sets it (theme/recipes.ts), so the classic template needs none.
//
//   colors   --xp-ink (the rest of the palette is tokensToCssVars': --xp-primary…)
//   type     --xp-font-display, --xp-font-ui, --xp-fs-display, --xp-title-scale…
//   space    --xp-space-xs … --xp-space-lg        radii  --xp-radius-sm … --xp-radius-pill
//   parts    --xp-panel-*, --xp-card-*, --xp-hud-*, --xp-btn-*, --xp-btn2-*, --xp-field-*,
//            --xp-title-*, --xp-pop-shadow, --xp-stage-*, --xp-wheel-*
//
// "@primary" and the other roles are written out here, with the brand's own primary and
// accent when it changed them: a gradient or a shadow built on them follows the brand.

const WHITE = "#FFFFFF";

export type BrandColors = Pick<ThemeTokens["colors"], "primary" | "accent">;

// The palette in force: the theme's, with the brand's primary and accent.
export function themePalette(
  manifest: ThemeManifest,
  brand: BrandColors | null,
): Record<string, string> {
  const palette: Record<string, string> = {
    ...manifest.palette,
    ...(brand ? { primary: brand.primary, accent: brand.accent } : null),
  };
  palette["primary-light"] = mixHex(palette.primary, WHITE, 0.42);
  palette["primary-deep"] = mixHex(palette.primary, "#000000", 0.2);
  return palette;
}

// Longest names first: "@primary-light" is not "@primary" followed by "-light".
const ROLE_PATTERN =
  /@(primary-light|primary-deep|primary|secondary|accent|surface|text|ink)\b/g;

function withRoles(value: string, palette: Record<string, string>): string {
  return value.replace(
    ROLE_PATTERN,
    (match, role: string) => palette[role] ?? match,
  );
}

// Text on a slice of the wheel: the theme's ink or white, whichever reads better.
function textOn(background: string, ink: string): string {
  return contrastRatio(WHITE, background) >= contrastRatio(ink, background)
    ? WHITE
    : ink;
}

const frameVars = (
  part: "panel" | "card",
  url: string | null,
  frame: ThemeManifest["panel"]["frame"],
): CssVars =>
  url && frame
    ? {
        [`--xp-${part}-frame`]: `url("${url}")`,
        [`--xp-${part}-frame-slice`]: `${frame.slice} fill`,
        [`--xp-${part}-frame-width`]: frame.width,
        [`--xp-${part}-frame-outset`]: frame.outset,
      }
    : {};

// The panel's shape (a cloud): its picture, the drop-shadow that follows it, and the room
// left around the texts so that none of them reaches its bumps.
function shapeVars(
  shape: ThemeManifest["panel"]["shape"],
  url: string | null,
  css: (value: string) => string,
): CssVars {
  if (!shape || !url) return {};
  return {
    "--xp-panel-shape": `url("${url}")`,
    "--xp-panel-shape-shadow": css(shape.shadow),
    "--xp-panel-shape-pad-inline": shape.padInline,
    "--xp-panel-shape-pad-block": shape.padBlock,
    "--xp-panel-shape-column": shape.columnMax,
    "--xp-panel-shape-pad-stack": shape.stack?.padInline ?? shape.padInline,
    "--xp-panel-shape-bleed": shape.stack?.bleed ?? "0px",
  };
}

// What one screen changes of the theme (set on its frame): its own title color, its own
// picture of the panel's shape, no shape at all (the game alone on the stage), a backdrop
// behind its title. Roles stay variables ("@primary" → var(--xp-primary)): the brand's own
// colors still follow.
export interface ScreenDress {
  vars: CssVars;
  shape: boolean; // the panel's shape is drawn behind the slots
  titleBackdrop: boolean;
}

export function screenDress(
  manifest: ThemeManifest | null,
  assets: ThemeAssets | null,
  screen: ThemeScreen | undefined,
): ScreenDress {
  if (!manifest || !assets || !screen) {
    return {
      vars: {},
      shape: Boolean(assets?.panelShape),
      titleBackdrop: false,
    };
  }
  const { shape } = manifest.panel;
  const vars: CssVars = {};
  const titleColor = manifest.title.screens[screen];
  if (titleColor) vars["--xp-title-color"] = roleVar(titleColor);
  const own = shape?.screens[screen];
  const ownUrl = assets.panelShapes[screen];
  if (ownUrl) vars["--xp-panel-shape"] = `url("${ownUrl}")`;
  if (own?.shadow) vars["--xp-panel-shape-shadow"] = roleVar(own.shadow);
  return {
    vars,
    shape: Boolean(assets.panelShape) && !shape?.hiddenOn.includes(screen),
    titleBackdrop:
      Boolean(assets.titleBackdrop) &&
      (manifest.title.backdrop?.screens.includes(screen) ?? false),
  };
}

// "@primary" → var(--xp-primary), in a color or inside a shadow; the rest as written.
function roleVar(value: string): string {
  return value.replace(
    ROLE_PATTERN,
    (_match, role: string) => `var(--xp-${role})`,
  );
}

export function manifestToCssVars(
  manifest: ThemeManifest,
  brand: BrandColors | null,
): CssVars {
  const palette = themePalette(manifest, brand);
  const css = (value: string) => withRoles(value, palette);
  const { tokens, panel, card, hud, button, field, title, stage, wheel } =
    manifest;
  const assets = resolveThemeAssets(manifest);
  const segments = wheel.segments.map(css);

  const vars: CssVars = {
    "--xp-ink": palette.ink,

    "--xp-font-display": templateFontStack(`"${manifest.fonts.display}"`),
    "--xp-font-ui": templateFontStack(`"${manifest.fonts.ui}"`),
    "--xp-fs-display": tokens.fontSize.display,
    "--xp-title-scale": tokens.fontSize.title,
    "--xp-fs-body": tokens.fontSize.body,
    "--xp-fs-label": tokens.fontSize.label,

    "--xp-space-xs": tokens.space.xs,
    "--xp-space-sm": tokens.space.sm,
    "--xp-space-md": tokens.space.md,
    "--xp-space-lg": tokens.space.lg,
    // The theme's radii replace the brand's scale (tokensToCssVars), everywhere.
    "--xp-radius-sm": tokens.radius.sm,
    "--xp-radius-md": tokens.radius.md,
    "--xp-radius-lg": tokens.radius.lg,
    "--xp-radius-pill": tokens.radius.pill,

    "--xp-panel-bg": css(panel.bg),
    "--xp-panel-text": css(panel.text),
    "--xp-panel-border": css(panel.border),
    "--xp-panel-border-width": panel.borderWidth,
    "--xp-panel-shadow": css(tokens.shadow.panel),
    ...frameVars("panel", assets.panelFrame, panel.frame),

    "--xp-card-bg": css(card.bg),
    "--xp-card-border": css(card.border),
    "--xp-card-border-width": card.borderWidth,
    "--xp-card-radius": tokens.radius.lg,
    "--xp-card-shadow": css(tokens.shadow.card),
    ...frameVars("card", assets.cardFrame, card.frame),

    "--xp-hud-bg": css(hud.bg),
    "--xp-hud-text": css(hud.text),
    "--xp-hud-border": css(hud.border),

    "--xp-btn-bg": css(button.primary.bg),
    "--xp-btn-text": css(button.primary.text),
    "--xp-btn-border": css(button.primary.border),
    "--xp-btn-border-width": button.primary.borderWidth,
    "--xp-btn-shadow": css(button.primary.shadow),
    "--xp-btn-shadow-pressed": css(button.primary.shadowPressed),
    "--xp-btn-radius": tokens.radius.pill,
    "--xp-btn2-bg": css(button.secondary.bg),
    "--xp-btn2-text": css(button.secondary.text),
    "--xp-btn2-border": css(button.secondary.border),
    "--xp-btn2-border-width": button.secondary.borderWidth,
    "--xp-btn2-shadow": css(button.secondary.shadow),
    "--xp-btn2-shadow-pressed": css(button.secondary.shadowPressed),
    // A quiet control (an outlined button, a quiz option) takes the secondary border.
    "--xp-outline": css(button.secondary.border),

    "--xp-field-bg": css(field.bg),
    "--xp-field-text": css(field.text),
    "--xp-field-border": css(field.border),
    "--xp-field-border-width": field.borderWidth,
    "--xp-field-shadow": css(field.shadow),
    ...(field.label ? { "--xp-field-label": css(field.label) } : {}),
    "--xp-field-label-font":
      field.labelFont === "display"
        ? "var(--xp-font-display)"
        : "var(--xp-font-ui)",
    "--xp-field-label-case":
      field.labelFont === "display" ? title.transform : "none",
    "--xp-field-label-tracking":
      field.labelFont === "display" ? "0.04em" : "normal",

    "--xp-title-color": css(title.color),
    "--xp-title-stroke": title.stroke ? css(title.stroke) : "transparent",
    "--xp-title-stroke-width": title.stroke ? title.strokeWidth : "0",
    "--xp-title-shadow": css(title.shadow),
    "--xp-title-transform": title.transform,
    "--xp-title-tracking": title.letterSpacing,
    "--xp-title-weight": String(title.weight),

    "--xp-pop-shadow": css(tokens.shadow.pop),

    "--xp-stage-color": stage.color,
    "--xp-stage-overlay": css(stage.overlay),
    "--xp-stage-overlay-opacity": String(stage.overlayOpacity),
    "--xp-stage-fit": stage.fit === "stretch" ? "100% 100%" : "cover",
    ...(stage.text
      ? {
          "--xp-stage-text": css(stage.text),
          "--xp-stage-text-muted": mixHex(css(stage.text), stage.color, 0.25),
        }
      : {}),
    ...shapeVars(panel.shape, assets.panelShape, css),
    ...(assets.titleBackdrop
      ? { "--xp-title-backdrop": `url("${assets.titleBackdrop}")` }
      : {}),

    "--xp-wheel-blank": css(wheel.blank),
    "--xp-wheel-blank-text": textOn(css(wheel.blank), palette.ink),
    "--xp-wheel-rim": css(wheel.rim),
    "--xp-wheel-rim-ink": css(wheel.rimInk),
    "--xp-wheel-bulb": wheel.bulbs ? css(wheel.bulbs) : "transparent",
    "--xp-wheel-pointer": css(wheel.pointer),
    "--xp-wheel-pointer-ink": css(wheel.pointerInk),
    "--xp-wheel-hub": css(wheel.hub),
    "--xp-wheel-hub-text": css(wheel.hubText),
    "--xp-wheel-bulb-ink": wheel.bulbInk ? css(wheel.bulbInk) : "transparent",
    "--xp-wheel-filter":
      wheel.shadow === "none"
        ? "none"
        : "drop-shadow(" + css(wheel.shadow) + ")",
  };
  segments.forEach((color, index) => {
    vars[`--xp-wheel-seg-${index + 1}`] = color;
    vars[`--xp-wheel-seg-text-${index + 1}`] = textOn(color, palette.ink);
  });
  return vars;
}

// The brand-level theme a templated page renders with (tokensToCssVars, the design checks):
// the theme's palette, mode and radius, with the brand's own primary and accent once it has
// changed them. A theme still on the template's own palette (presetId) follows the theme.json
// as it is today, whatever was saved with an older version of it.
export function themedTokens(
  theme: ThemeTokens,
  manifest: ThemeManifest,
): ThemeTokens {
  const { ink: _ink, ...colors } = manifest.palette;
  const brand = theme.presetId === manifest.id ? colors : theme.colors;
  return {
    ...theme,
    mode: manifest.mode,
    radius: manifest.radius,
    colors: { ...colors, primary: brand.primary, accent: brand.accent },
  };
}
