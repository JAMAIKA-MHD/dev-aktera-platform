import type { CampaignSnapshot } from "../../domain/campaign";
import { createDefaultExperience } from "../../domain/defaults";
import type { GameType } from "../../domain/gameTypes";
import { localized, type Locale } from "../../domain/locale";
import type { ExperienceConfig, ScreenKey } from "../../domain/types";
import { createDemoCampaign } from "../../presets/demoCampaign";

// Fixed configurations rendered by /xp-frame?fixture=<name>: control pages for the
// responsive sweep (T3.8) and for manual checks with the browser's device mode.
// Each task of phases 3 to 5 adds its own fixtures. Brand names are fictional.

export type FixtureView = "layout-debug" | "theme-presets" | "frame";

export interface Fixture {
  view: FixtureView;
  description: string;
  config: ExperienceConfig;
  campaign: CampaignSnapshot;
  screen: ScreenKey; // screen drawn by the frame view
}

interface FixtureOptions {
  gameType?: GameType;
  presetId?: string;
  screen?: ScreenKey;
  customize?: (config: ExperienceConfig) => void;
}

function fixture(
  view: FixtureView,
  description: string,
  options: FixtureOptions = {},
): () => Fixture {
  const { gameType = "lucky_wheel", presetId = "midnight-gold" } = options;
  return () => {
    const campaign = createDemoCampaign(gameType);
    const config = createDefaultExperience({ gameType, campaign, presetId });
    options.customize?.(config);
    return {
      view,
      description,
      config,
      campaign,
      screen: options.screen ?? "welcome",
    };
  };
}

function zetaMarket(config: ExperienceConfig): void {
  config.brand.name = "Zeta Market";
  config.brand.tagline = localized(
    "Le bon prix, près de chez vous",
    "السعر المناسب، بالقرب منك",
    "The right price, close to home",
  );
}

// Worst cases of brand-typed text: long names, a title beyond two lines, an unbroken URL.
function longTexts(config: ExperienceConfig): void {
  config.brand.name = "Grand Bazar des Hauts-Plateaux · Sétif Centre";
  config.brand.logo = { kind: "remote", url: "/aktera-logo.png" };
  config.brand.tagline = localized(
    "Ouvert 7 jours sur 7, livraison offerte dans les 58 wilayas dès 5 000 DA d'achat",
    "مفتوح طوال أيام الأسبوع، توصيل مجاني إلى 58 ولاية ابتداءً من 5000 دج",
    "Open 7 days a week, free delivery to all 58 wilayas from 5,000 DA",
  );
  const welcome = config.screens.welcome;
  welcome.hero = "gift";
  welcome.title = localized(
    "Tentez votre chance et remportez l'un des nombreux cadeaux exceptionnels de notre grande fête de la rentrée",
    "جرّب حظك واربح إحدى الهدايا الاستثنائية العديدة في احتفالنا الكبير بالدخول المدرسي والجامعي",
    "Try your luck and win one of the many exceptional gifts of our big back-to-school celebration",
  );
  welcome.subtitle = localized(
    "Règlement complet : https://www.grand-bazar-des-hauts-plateaux.dz/reglement-du-jeu-concours-de-la-rentree-2026",
    "النظام الكامل: https://www.grand-bazar-des-hauts-plateaux.dz/reglement-du-jeu-concours-de-la-rentree-2026",
    "Full rules: https://www.grand-bazar-des-hauts-plateaux.dz/reglement-du-jeu-concours-de-la-rentree-2026",
  );
}

const FIXTURES: Readonly<Record<string, () => Fixture>> = {
  "layout-debug": fixture(
    "layout-debug",
    "Current layout mode, viewport size and theme tokens",
  ),
  "theme-presets": fixture(
    "theme-presets",
    "The five style presets, each drawn from its own theme variables",
  ),
  "welcome-midnight-gold": fixture(
    "frame",
    "Welcome screen of the reference design: header, title and copy (slots 1 to 4)",
    { customize: zetaMarket },
  ),
  "frame-long-texts": fixture(
    "frame",
    "Long brand texts, a title beyond two lines, an unbroken URL and a logo image",
    { customize: longTexts },
  ),
  "frame-no-header": fixture(
    "frame",
    "Win screen without the header: trophy hero and status badge on its own row",
    {
      screen: "win",
      customize: (config) => {
        zetaMarket(config);
        config.screens.win.showHeader = false;
      },
    },
  ),
};

export const FIXTURE_NAMES = Object.keys(FIXTURES);

export function getFixture(name: string): Fixture | null {
  return Object.hasOwn(FIXTURES, name) ? FIXTURES[name]() : null;
}

export function readFixtureLocale(value: string | null): Locale {
  return value === "ar" || value === "en" ? value : "fr";
}
