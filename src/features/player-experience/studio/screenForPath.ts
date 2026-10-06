import type { PreviewScreen } from "./store";

// Which screen shows a configuration path, in the Sections panel and in the preview: where a
// click in the preview, a design issue (T6.8) or a layout issue (T6.10) leads. Null when the
// path belongs to no screen in particular (languages, brand, legal...): the screen stays.
// Paths are the dot paths of DesignIssue.path and data-xp-edit, e.g. "screens.win.title".
const SCREEN_KEYS: readonly PreviewScreen[] = [
  "welcome",
  "register",
  "play",
  "win",
  "lose",
];

export function screenForPath(path: string): PreviewScreen | null {
  const [root, second] = path.split(".");
  switch (root) {
    case "screens":
      return SCREEN_KEYS.find((key) => key === second) ?? null;
    case "sections":
      return "welcome";
    case "form":
      return "register";
    case "game":
      // The teaser is the game on the welcome screen, before anyone plays.
      return second === "teaser" ? "welcome" : "play";
    case "prizeDisplay":
      return "play";
    default:
      return null;
  }
}
