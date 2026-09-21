import { useMemo, type CSSProperties, type ReactNode } from "react";
import { getDirection, type Locale } from "../domain/locale";
import type { ThemeTokens } from "../domain/types";
import { backgroundStyle } from "./backgrounds";
import { tokensToCssVars } from "./tokens";

// Applies a theme to its subtree: CSS variables, direction, language, font and background.
// It never touches the document (no <html> class, no <head> change): several scopes can
// live side by side, and the Studio's own page is never restyled.

export interface ThemeScopeProps {
  theme: ThemeTokens;
  locale: Locale;
  imageUrl?: string | null; // resolved background image (AssetStorage.resolveUrl)
  className?: string;
  children?: ReactNode;
}

export function ThemeScope({
  theme,
  locale,
  imageUrl = null,
  className,
  children,
}: ThemeScopeProps) {
  const style = useMemo(
    () =>
      ({
        ...tokensToCssVars(theme),
        ...backgroundStyle(theme, imageUrl),
        color: "var(--xp-text)",
        fontFamily: "var(--xp-font)",
        colorScheme: theme.mode,
      }) as CSSProperties,
    [theme, imageUrl],
  );
  return (
    <div
      className={className ? `xp-root ${className}` : "xp-root"}
      style={style}
      dir={getDirection(locale)}
      lang={locale}
      data-xp-mode={theme.mode}
      data-xp-font={theme.font}
    >
      {children}
    </div>
  );
}
