import { useMemo, type CSSProperties, type ReactNode } from "react";
import { getDirection, type Locale } from "../domain/locale";
import type { ThemeManifest } from "../domain/themeManifest";
import { DEFAULT_TEMPLATE_ID, type TemplateId } from "../domain/templates";
import type { ThemeTokens } from "../domain/types";
import { getThemeManifest } from "../presets/themeManifests";
import { backgroundStyle } from "./backgrounds";
import { GameThemeContext, type GameTheme } from "./GameTheme";
import { manifestToCssVars, themedTokens } from "./shellVars";
import { resolveThemeAssets } from "./themeAssets";
import { tokensToCssVars } from "./tokens";

// The theme provider of the player screens: applies a theme to its subtree as CSS variables,
// with direction, language, font and background. It never touches the document (no <html>
// class, no <head> change): several scopes can live side by side, and the Studio's own page
// is never restyled.
//
// A template of the library reads its theme.json (themes/<id>/): the theme's palette (with
// the brand's own primary and accent), then its shell variables (shellVars.ts), and its files
// for the shell (useGameTheme). It paints its own stage (runtime/shell/GameFrame), so the
// brand's background is left out. The classic template sets none of this.

export interface ThemeScopeProps {
  theme: ThemeTokens;
  locale: Locale;
  templateId?: TemplateId;
  // Another theme than the template's own: a check that the shell holds with any theme.json.
  manifest?: ThemeManifest | null;
  imageUrl?: string | null; // resolved background image (AssetStorage.resolveUrl)
  className?: string;
  children?: ReactNode;
}

export function ThemeScope({
  theme,
  locale,
  templateId = DEFAULT_TEMPLATE_ID,
  manifest: given,
  imageUrl = null,
  className,
  children,
}: ThemeScopeProps) {
  const manifest = given === undefined ? getThemeManifest(templateId) : given;
  const gameTheme = useMemo<GameTheme>(
    () => ({
      manifest,
      assets: manifest ? resolveThemeAssets(manifest) : null,
    }),
    [manifest],
  );
  const style = useMemo(() => {
    const tokens = manifest ? themedTokens(theme, manifest) : theme;
    return {
      ...tokensToCssVars(tokens),
      ...(manifest
        ? manifestToCssVars(manifest, tokens.colors)
        : backgroundStyle(theme, imageUrl)),
      color: "var(--xp-text)",
      fontFamily: "var(--xp-font)",
      colorScheme: tokens.mode,
    } as CSSProperties;
  }, [theme, manifest, imageUrl]);
  return (
    <GameThemeContext.Provider value={gameTheme}>
      <div
        className={className ? `xp-root ${className}` : "xp-root"}
        style={style}
        dir={getDirection(locale)}
        lang={locale}
        data-xp-mode={manifest?.mode ?? theme.mode}
        data-xp-font={theme.font}
        data-xp-template={templateId}
        data-xp-themed={manifest ? manifest.id : undefined}
        data-xp-layout={manifest?.layout.kind}
        data-xp-play-cta={manifest?.layout.playCta}
        data-xp-footer-on-stage={manifest?.stage.footerText ? "" : undefined}
        data-xp-panel-room={manifest?.panel.room ? "" : undefined}
        data-xp-btn-frame={
          gameTheme.assets?.buttonFrames.primary ? "" : undefined
        }
        data-xp-btn2-frame={
          gameTheme.assets?.buttonFrames.secondary ? "" : undefined
        }
        data-xp-notch={manifest?.button.notch ? "" : undefined}
        data-xp-reward-card={manifest?.layout.rewardCard}
        data-xp-copy={manifest && copyStyled(manifest) ? "" : undefined}
        data-xp-copy-size={manifest?.copy.size ? "" : undefined}
        data-xp-copy-rule={manifest?.copy.rule ? "" : undefined}
        data-xp-panel-frame={gameTheme.assets?.panelFrame ? "" : undefined}
        data-xp-panel-shape={gameTheme.assets?.panelShape ? "" : undefined}
        data-xp-card-frame={gameTheme.assets?.cardFrame ? "" : undefined}
        {...motionAttributes(manifest)}
      >
        {children}
      </div>
    </GameThemeContext.Provider>
  );
}

// The theme's motion as attributes of the root (runtime/shell/motion.css reads them): only
// what differs from the classic motion is set.
function motionAttributes(
  manifest: ThemeManifest | null,
): Record<`data-xp-fx-${string}`, string | undefined> {
  const motion = manifest?.motion;
  if (!motion) return {};
  const set = (on: boolean, value = "") => (on ? value : undefined);
  return {
    "data-xp-fx-rays": set(motion.rays !== null),
    "data-xp-fx-vignette": set(motion.vignette !== null),
    "data-xp-fx-entrance": set(motion.entrance !== "rise", motion.entrance),
    "data-xp-fx-buttons": set(motion.buttons !== "press", motion.buttons),
    "data-xp-fx-fields": set(motion.fields !== "plain", motion.fields),
    "data-xp-fx-impact": set(motion.impact),
    "data-xp-fx-games": set(motion.games !== "classic", motion.games),
    "data-xp-fx-feel": set(motion.feel !== "smooth", motion.feel),
    "data-xp-fx-wipe": motion.wipe?.kind,
    "data-xp-fx-crt": set(motion.crt),
    "data-xp-fx-press": set(motion.pressStart),
  };
}

// The theme styles the line under the title (copy in theme.json).
function copyStyled(manifest: ThemeManifest): boolean {
  const { copy } = manifest;
  return (
    copy.color !== undefined ||
    copy.font !== "body" ||
    copy.transform !== "none" ||
    Object.keys(copy.screens).length > 0
  );
}
