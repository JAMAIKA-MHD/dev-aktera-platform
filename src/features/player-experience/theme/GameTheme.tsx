import { createContext, useContext } from "react";
import type { ThemeManifest } from "../domain/themeManifest";
import type { ThemeAssets } from "./themeAssets";

// The theme.json in force under a ThemeScope, and the URLs of its files: what the shell
// reads besides the CSS variables — a background to show, a prize's picture, a sound to
// play. Both are null on the classic template, which is styled by the brand's theme alone.

export interface GameTheme {
  manifest: ThemeManifest | null;
  assets: ThemeAssets | null;
}

const NO_THEME: GameTheme = { manifest: null, assets: null };

export const GameThemeContext = createContext<GameTheme>(NO_THEME);

export function useGameTheme(): GameTheme {
  return useContext(GameThemeContext);
}
