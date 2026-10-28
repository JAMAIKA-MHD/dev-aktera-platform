import {
  themeFilePath,
  type PrizeArtName,
  type ThemeDecor,
  type ThemeFlyer,
  type ThemeManifest,
  type ThemeScreen,
  type ThemeSoundName,
} from "../domain/themeManifest";
import type { GameType } from "../domain/gameTypes";
import type { IconName } from "../domain/icons";

// The files a theme.json names (assets/…), as the URLs the bundler gives them: hashed,
// cached, served with the app, never fetched from anywhere else. The runtime and the Studio
// read a theme's images and sounds through here only.

const URLS = import.meta.glob<string>("../themes/*/assets/**/*", {
  eager: true,
  query: "?url",
  import: "default",
});

export function themeAssetUrl(
  manifest: Pick<ThemeManifest, "id">,
  path: string,
): string | null {
  return URLS[`../themes/${themeFilePath(manifest.id, path)}`] ?? null;
}

export interface ResolvedDecor extends Omit<ThemeDecor, "src"> {
  url: string;
}

export interface ResolvedFlyer extends Omit<ThemeFlyer, "src"> {
  url: string;
}

// Everything the shell shows from a theme, resolved once per theme.
export interface ThemeAssets {
  background: (gameType: GameType, screen: string | undefined) => string | null;
  panelFrame: string | null;
  panelFrames: Readonly<Partial<Record<ThemeScreen, string>>>; // its picture per screen
  // The panel's shape (a cloud) and its picture on the screens that take another one.
  panelShape: string | null;
  panelShapes: Readonly<Partial<Record<ThemeScreen, string>>>;
  // Its tall picture on a phone, and per screen.
  panelShapeStack: string | null;
  panelShapeStacks: Readonly<Partial<Record<ThemeScreen, string>>>;
  titleBackdrop: string | null;
  wheelPointer: string | null;
  hitArt: string | null; // the theme's own Hit It target
  // The template's own picture above the title of a screen, and how wide it is drawn.
  heroes: Readonly<
    Partial<Record<ThemeScreen, { url: string; width: string }>>
  >;
  cardFrame: string | null;
  buttonFrames: Readonly<{ primary: string | null; secondary: string | null }>;
  decor: readonly ResolvedDecor[];
  flyers: readonly ResolvedFlyer[]; // what crosses the stage (motion.flyers)
  prizes: Readonly<Partial<Record<PrizeArtName, string>>>;
  characters: Readonly<{ happy?: string; sad?: string }>;
  sounds: Readonly<Partial<Record<ThemeSoundName, string>>>;
}

function urls<K extends string>(
  manifest: ThemeManifest,
  paths: Partial<Record<K, string>>,
): Partial<Record<K, string>> {
  const resolved: Partial<Record<K, string>> = {};
  for (const [key, path] of Object.entries(paths) as [K, string][]) {
    const url = themeAssetUrl(manifest, path);
    if (url) resolved[key] = url;
  }
  return resolved;
}

const cache = new WeakMap<ThemeManifest, ThemeAssets>();

export function resolveThemeAssets(manifest: ThemeManifest): ThemeAssets {
  const cached = cache.get(manifest);
  if (cached) return cached;
  const { backgrounds } = manifest.stage;
  const url = (path: string | undefined) =>
    path ? themeAssetUrl(manifest, path) : null;
  const assets: ThemeAssets = {
    // The screen's own background (a win), else the game's, else the theme's.
    background: (gameType, screen) =>
      url(
        (screen === "win" || screen === "lose"
          ? backgrounds.screens[screen]
          : undefined) ??
          backgrounds.games[gameType] ??
          backgrounds.default,
      ),
    panelFrame: url(manifest.panel.frame?.src),
    panelFrames: urls(manifest, manifest.panel.frameScreens),
    panelShape: url(manifest.panel.shape?.src),
    panelShapes: urls(
      manifest,
      Object.fromEntries(
        Object.entries(manifest.panel.shape?.screens ?? {}).flatMap(
          ([screen, shape]) => (shape?.src ? [[screen, shape.src]] : []),
        ),
      ) as Partial<Record<ThemeScreen, string>>,
    ),
    panelShapeStack: url(manifest.panel.shape?.stack?.src),
    panelShapeStacks: urls(
      manifest,
      manifest.panel.shape?.stack?.screens ?? {},
    ),
    titleBackdrop: url(manifest.title.backdrop?.src),
    wheelPointer: url(manifest.wheel.pointerArt ?? undefined),
    hitArt: url(manifest.games.hitIt.art),
    heroes: Object.fromEntries(
      Object.entries(manifest.heroes).flatMap(([screen, hero]) => {
        const resolved = hero ? url(hero.src) : null;
        return resolved
          ? [[screen, { url: resolved, width: hero!.width }]]
          : [];
      }),
    ),
    cardFrame: url(manifest.card.frame?.src),
    buttonFrames: {
      primary: url(manifest.button.primary.frame?.src),
      secondary: url(manifest.button.secondary.frame?.src),
    },
    decor: manifest.stage.decor.flatMap(({ src, ...decor }) => {
      const resolved = url(src);
      return resolved ? [{ ...decor, url: resolved }] : [];
    }),
    flyers: manifest.motion.flyers.flatMap(({ src, ...flyer }) => {
      const resolved = url(src);
      return resolved ? [{ ...flyer, url: resolved }] : [];
    }),
    prizes: urls(manifest, manifest.prizes),
    characters: urls(manifest, manifest.characters),
    sounds: urls(manifest, manifest.sounds),
  };
  cache.set(manifest, assets);
  return assets;
}

// A prize's picture in the theme's own art, from the icon the brand gave it.
const ART_FOR_ICON: Readonly<Partial<Record<IconName, PrizeArtName>>> = {
  gift: "gift",
  box: "gift",
  "shopping-bag": "gift",
  ticket: "ticket",
  percent: "ticket",
  coins: "coin",
  star: "star",
  sparkles: "star",
  gem: "gem",
  trophy: "trophy",
  crown: "crown",
  target: "medal",
};

export function prizeArtUrl(
  assets: ThemeAssets | null,
  icon: IconName | null,
): string | null {
  if (!assets) return null;
  const name = icon ? ART_FOR_ICON[icon] : undefined;
  return (name && assets.prizes[name]) ?? assets.prizes.gift ?? null;
}
