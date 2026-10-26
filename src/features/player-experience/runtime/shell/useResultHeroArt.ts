import type { ScreenContent } from "../../domain/types";
import { useGameTheme } from "../../theme/GameTheme";
import { useLayoutMode } from "../layout/useLayoutMode";

// The theme's own character on a result screen of a spotlight template (a star over a win, a
// sad face over a loss), drawn in slot 2 above the title, as on the template's own result
// screens: the frame shows it there, and the screen's body then leaves it out. None on a low
// screen, where slot 2 is dropped (the body shows it instead), nor on any other layout. The
// brand's choice still holds: "none" above the title means none, the character included.
export function useResultHeroArt(
  screen: string | undefined,
  hero: ScreenContent["hero"],
): string | null {
  const { manifest, assets } = useGameTheme();
  const { density } = useLayoutMode();
  if (
    hero === "none" ||
    manifest?.layout.kind !== "spotlight" ||
    !assets ||
    density === "tight"
  ) {
    return null;
  }
  if (screen === "win") return assets.characters.happy ?? null;
  if (screen === "lose") return assets.characters.sad ?? null;
  return null;
}
