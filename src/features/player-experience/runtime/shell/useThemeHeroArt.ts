import { useGameTheme } from "../../theme/GameTheme";
import { useLayoutMode } from "../layout/useLayoutMode";

export interface ThemeHeroArt {
  url: string;
  width: string | null; // the theme's own size for it, else the shell's
}

// The template's own picture above the title of a screen, in a spotlight template: a trophy
// over the login, a star over a win, a sad face over a loss — drawn in slot 2, as on the
// template's own screens. It is part of the template's design, shown whatever the brand set
// there (the Studio says so in place of that choice). The frame draws it, and a result
// screen's body then leaves its own picture out. None on a low screen, where slot 2 is
// dropped (a result's body shows its picture instead), nor on any other layout.
export function useThemeHeroArt(
  screen: string | undefined,
): ThemeHeroArt | null {
  const { manifest, assets } = useGameTheme();
  const { density } = useLayoutMode();
  if (manifest?.layout.kind !== "spotlight" || !assets || density === "tight") {
    return null;
  }
  return themeHeroArt(assets, screen, manifest.layout.characters === "hero");
}

// The same answer without the screen's density, for the Studio's panels.
export function themeHeroArt(
  assets: NonNullable<ReturnType<typeof useGameTheme>["assets"]>,
  screen: string | undefined,
  withCharacters = true, // a theme may keep its characters in the body (layout.characters)
): ThemeHeroArt | null {
  const own = screen
    ? assets.heroes[screen as keyof typeof assets.heroes]
    : undefined;
  if (own) return own;
  if (!withCharacters) return null;
  const character =
    screen === "win"
      ? assets.characters.happy
      : screen === "lose"
        ? assets.characters.sad
        : undefined;
  return character ? { url: character, width: null } : null;
}
