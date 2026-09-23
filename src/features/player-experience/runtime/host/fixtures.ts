import type { CampaignSnapshot } from "../../domain/campaign";
import type { FlowScreen } from "../../domain/flow";
import { createDefaultExperience } from "../../domain/defaults";
import type { GameType } from "../../domain/gameTypes";
import { localized, type Locale } from "../../domain/locale";
import type { ExperienceConfig, ScreenKey } from "../../domain/types";
import { defaultTermsBody } from "../../presets/contentDefaults";
import { createDemoCampaign } from "../../presets/demoCampaign";
import type { ScriptedScenario } from "../../services/createLocalServices";
import type { GatewayMode } from "../../services/ports";
import type { FramePreviewState } from "./FramePreview";

// Fixed configurations rendered by /xp-frame?fixture=<name>: control pages for the
// responsive sweep (T3.8) and for manual checks with the browser's device mode.
// Each task of phases 3 to 5 adds its own fixtures. Brand names are fictional.

export type FixtureView =
  | "layout-debug"
  | "theme-presets"
  | "feedback-debug"
  | "all-games"
  | "frame"
  | "flow";

// The journey of the flow view: PlayerExperience on local services (FrameExperience).
export interface FlowFixture {
  gateway: "demo" | "scripted";
  scenario?: ScriptedScenario;
  initialScreen?: FlowScreen;
  allowedGatewayModes?: readonly GatewayMode[];
}

export interface Fixture {
  view: FixtureView;
  description: string;
  config: ExperienceConfig;
  campaign: CampaignSnapshot;
  screen: ScreenKey; // screen drawn by the frame view
  state?: FramePreviewState; // what the flow and the game would give the frame
  flow: FlowFixture; // read by the flow view only
}

interface FixtureOptions {
  gameType?: GameType;
  presetId?: string;
  screen?: ScreenKey;
  state?: FramePreviewState;
  flow?: FlowFixture;
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
      state: options.state,
      flow: options.flow ?? { gateway: "scripted" },
    };
  };
}

function zetaMarket(config: ExperienceConfig): void {
  config.brand.name = "Zeta Market";
  config.legal.organizerName = "Zeta Market";
  config.legal.termsBody = defaultTermsBody("Zeta Market");
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
  welcome.secondaryCta = localized(
    "Découvrir tous les lots et le règlement complet de la campagne",
    "اكتشف كل الجوائز والنظام الكامل للحملة",
    "See every prize and the full rules of the campaign",
  );
  config.legal.organizerName = config.brand.name;
  config.legal.termsBody = defaultTermsBody(config.brand.name);
  config.legal.legalLine = localized(
    "Jeu gratuit sans obligation d'achat • Une participation par numéro de téléphone • Lots valables 30 jours en magasin • Voir le règlement complet",
    "مسابقة مجانية دون إلزامية الشراء • مشاركة واحدة لكل رقم هاتف • الجوائز صالحة 30 يوماً في المتجر • اطّلع على النظام الكامل",
    "Free game, no purchase necessary • One entry per phone number • Prizes valid 30 days in store • See the full rules",
  );
  config.sections.jackpot.title = localized(
    "Un scooter électrique, des smartphones et des centaines de bons d'achat à gagner",
    "دراجة كهربائية وهواتف ذكية ومئات قسائم الشراء للربح",
    "An electric scooter, smartphones and hundreds of vouchers to win",
  );
  config.sections.jackpot.badge = localized(
    "Tirage chaque jour",
    "سحب كل يوم",
    "Daily draw",
  );
  config.sections.prizeChips.items.push({
    id: "fixture-chip-scooter",
    icon: "zap",
    value: localized(
      "Scooter électrique",
      "دراجة كهربائية",
      "Electric scooter",
    ),
    caption: localized(
      "Le grand lot de la rentrée",
      "الجائزة الكبرى للدخول",
      "The grand back-to-school prize",
    ),
    tone: "primary",
  });
  // A link to a real page, and one that must never become a link (javascript:).
  config.legal.links.push(
    {
      id: "fixture-link-site",
      kind: "url",
      label: localized("Site", "الموقع", "Website"),
      url: "https://example.com/",
    },
    {
      id: "fixture-link-unsafe",
      kind: "url",
      label: localized("Piège", "فخ", "Trap"),
      url: "javascript:alert(1)",
    },
  );
}

function hitItPlay(config: ExperienceConfig): void {
  zetaMarket(config);
  const play = config.screens.play;
  play.reinforcement.text = localized(
    "Plus que 10 secondes",
    "بقيت 10 ثوانٍ",
    "10 seconds left",
  );
  play.secondaryCta = localized("Voir les règles", "القواعد", "See the rules");
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
  "all-games": fixture(
    "all-games",
    "The five pregame teasers on one page, one per mechanic (T5.7)",
  ),
  "feedback-debug": fixture(
    "feedback-debug",
    "Sounds, confetti, vibration and the runtime hooks, one button each",
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
  "frame-play-hit-it": fixture(
    "frame",
    "Hit It play screen: timer reinforcement from the configuration, secondary CTA",
    { gameType: "hit_it", screen: "play", customize: hitItPlay },
  ),
  "frame-quiz-progress": fixture(
    "frame",
    "Quiz play screen: progress dots and live text given by the game",
    {
      gameType: "quiz",
      screen: "play",
      customize: zetaMarket,
      state: {
        reinforcement: { text: "2 / 3", progress: { current: 2, total: 3 } },
      },
    },
  ),
  "frame-cta-loading": fixture(
    "frame",
    "Welcome screen while the primary action is under way",
    { customize: zetaMarket, state: { cta: { loading: true } } },
  ),
  "frame-cta-disabled": fixture(
    "frame",
    "Registration screen while the form is not valid: primary CTA disabled",
    {
      screen: "register",
      customize: zetaMarket,
      state: { cta: { disabled: true } },
    },
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
  "flow-welcome": fixture(
    "flow",
    "The player journey from its start (scripted gateway: a loss)",
    { customize: zetaMarket, flow: { gateway: "scripted", scenario: "lose" } },
  ),
  "flow-gateway-refused": fixture(
    "flow",
    "A page that only accepts the live gateway, given a demo one: no game",
    {
      customize: zetaMarket,
      flow: { gateway: "demo", allowedGatewayModes: ["live"] },
    },
  ),
  register: fixture(
    "flow",
    "Registration screen: the default fields (name, phone, wilaya) and the consent",
    {
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "lose",
        initialScreen: "register",
      },
    },
  ),
  "register-all-fields": fixture(
    "flow",
    "Registration screen at its tallest: the four fields, all required",
    {
      customize: (config) => {
        zetaMarket(config);
        for (const field of config.form.fields) {
          field.enabled = true;
          field.required = true;
        }
      },
      flow: {
        gateway: "scripted",
        scenario: "lose",
        initialScreen: "register",
      },
    },
  ),
  resolving: fixture(
    "flow",
    "Waiting for the draw: turning indicator, no CTA (T4.3)",
    {
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "lose",
        initialScreen: "resolving",
      },
    },
  ),
  "status-duplicate": fixture(
    "flow",
    "Status: already played with this phone number, only a way back (T4.3)",
    {
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "duplicate",
        initialScreen: "duplicate",
      },
    },
  ),
  "status-closed": fixture(
    "flow",
    "Status: the campaign is over, only a way back (T4.3)",
    {
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "closed",
        initialScreen: "closed",
      },
    },
  ),
  "status-error": fixture(
    "flow",
    "Status: network error, with Retry and Back (T4.3)",
    {
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "network-error",
        initialScreen: "error",
      },
    },
  ),
  "wheel-play": fixture(
    "flow",
    "The wheel on stage, waiting for the tap that launches it (T5.2)",
    {
      customize: zetaMarket,
      flow: { gateway: "scripted", scenario: "lose", initialScreen: "play" },
    },
  ),
  "wheel-spinning": fixture(
    "flow",
    "The wheel mid-spin, landing on the prize it was handed (T5.7)",
    {
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "win-demo-prize-voucher",
        initialScreen: "revealing",
      },
    },
  ),
  "wheel-welcome": fixture(
    "flow",
    "The welcome screen, with the campaign's own wheel turning as its teaser (T5.2)",
    { customize: zetaMarket, flow: { gateway: "scripted", scenario: "lose" } },
  ),
  "scratch-play": fixture(
    "flow",
    "The scratch card, ready to be scratched off the prize it already hides (T5.3)",
    {
      gameType: "scratch_card",
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "win-demo-prize-voucher",
        initialScreen: "revealing",
      },
    },
  ),
  "scratch-welcome": fixture(
    "flow",
    "The welcome screen of a scratch campaign: the brand's own ticket, scratched by a coin (T5.3)",
    {
      gameType: "scratch_card",
      customize: zetaMarket,
      flow: { gateway: "scripted", scenario: "lose" },
    },
  ),
  "boxes-play": fixture(
    "flow",
    "The three mystery boxes, waiting to be picked (T5.4)",
    {
      gameType: "mystery_box",
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "win-demo-prize-voucher",
        initialScreen: "play",
      },
    },
  ),
  "boxes-welcome": fixture(
    "flow",
    "The welcome screen of a boxes campaign: the brand's own boxes, floating (T5.4)",
    {
      gameType: "mystery_box",
      customize: zetaMarket,
      flow: { gateway: "scripted", scenario: "lose" },
    },
  ),
  "quiz-play": fixture(
    "flow",
    "The quiz, on its first question, with the campaign's own timer (T5.5)",
    {
      gameType: "quiz",
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "win-demo-prize-voucher",
        initialScreen: "play",
      },
    },
  ),
  "quiz-welcome": fixture(
    "flow",
    "The welcome screen of a quiz campaign: the card, its counter, and question marks (T5.5)",
    {
      gameType: "quiz",
      customize: zetaMarket,
      flow: { gateway: "scripted", scenario: "lose" },
    },
  ),
  "hit-it-play": fixture(
    "flow",
    "Hit It in play: the target, the count and the campaign's own clock (T5.6)",
    {
      gameType: "hit_it",
      customize: zetaMarket,
      flow: {
        gateway: "scripted",
        scenario: "win-demo-prize-voucher",
        initialScreen: "play",
      },
    },
  ),
  "hit-it-welcome": fixture(
    "flow",
    "The welcome screen of a Hit It campaign: the target hopping, marked Démo (T5.6)",
    {
      gameType: "hit_it",
      customize: zetaMarket,
      flow: { gateway: "scripted", scenario: "lose" },
    },
  ),
  "flow-win": fixture(
    "flow",
    "The prize won, its DEMO code, copy, confirmation and sharing (T4.4)",
    {
      customize: zetaMarket,
      flow: { gateway: "scripted", scenario: "lose", initialScreen: "win" },
    },
  ),
  "flow-lose": fixture(
    "flow",
    "A warm consolation and a single share button, no bonus try (T4.4)",
    {
      customize: zetaMarket,
      flow: { gateway: "scripted", scenario: "lose", initialScreen: "lose" },
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
