import { describe, expect, expectTypeOf, it } from "vitest";
import type { Campaign } from "@/src/types";
import type { CampaignSnapshot } from "./campaign";
import type { ExperienceConfig, GameSettings, ScreenContent } from "./types";

// True when T only holds JSON values: no functions, Dates, class instances, symbols or bigints.
type IsJson<T> = T extends string | number | boolean | null | undefined
  ? true
  : T extends (...args: never[]) => unknown
    ? false
    : T extends readonly (infer Item)[]
      ? IsJson<Item>
      : T extends object
        ? false extends { [K in keyof T]-?: IsJson<T[K]> }[keyof T]
          ? false
          : true
        : false;

const screen = (title: string): ScreenContent => ({
  showHeader: true,
  hero: "none",
  title: { fr: title },
  subtitle: {},
  reinforcement: { kind: "none", text: {} },
  primaryCta: { fr: "Continuer" },
  secondaryCta: null,
});

// Structural sample: every optional block is filled so the round trip covers the whole model.
const sampleConfig: ExperienceConfig = {
  schemaVersion: 1,
  id: "6f1c0b0e-3c1d-4b8e-9d7a-2f0d5b1a9c11",
  campaignId: "c-123",
  templateId: "eight-slot",
  updatedAt: "2026-09-21T10:00:00.000Z",
  locales: { default: "fr", enabled: ["fr", "ar", "en"] },
  theme: {
    presetId: "midnight-gold",
    mode: "dark",
    colors: {
      primary: "#F5BA41",
      secondary: "#FBBF24",
      accent: "#10B981",
      surface: "#0A1120",
      text: "#FFFFFF",
    },
    background: {
      kind: "image",
      image: { kind: "remote", url: "https://example.com/bg.webp" },
      overlayOpacity: 0.85,
      focus: { x: 50, y: 40 },
    },
    radius: "pill",
    font: "poppins",
  },
  brand: {
    name: "Zeta Market",
    logo: { kind: "dataUrl", url: "data:image/webp;base64,AAAA" },
    logoIcon: "crown",
    tagline: { fr: "Le bon prix, près de chez vous" },
  },
  screens: {
    welcome: {
      ...screen("Tentez votre chance instantanément"),
      title: {
        fr: "Tentez votre chance instantanément",
        ar: "جرب حظك الآن واربح فوراً",
        en: "Test your luck & win instantly",
      },
      secondaryCta: { fr: "Voir le règlement" },
    },
    register: screen("Vos coordonnées"),
    play: screen("Tournez la roue !"),
    win: screen("Bravo !"),
    lose: screen("Pas de chance cette fois"),
  },
  sections: {
    jackpot: {
      enabled: true,
      eyebrow: { fr: "Offre rentrée" },
      title: { fr: "Panier 5 000 DA · -30 %" },
      badge: { fr: "Gagnant" },
      icon: "trophy",
    },
    prizeChips: {
      enabled: true,
      items: [
        {
          id: "chip-1",
          icon: "coins",
          value: { fr: "5 000 DA" },
          caption: { fr: "Cash immédiat" },
          tone: "primary",
        },
      ],
    },
  },
  form: {
    fields: [
      {
        key: "phone",
        enabled: true,
        required: true,
        label: { fr: "Numéro de téléphone" },
        placeholder: { fr: "05 / 06 / 07 XX XX XX XX" },
      },
    ],
    consent: {
      text: { fr: "J'accepte la politique de confidentialité." },
      policyVersion: "2026-09-01",
    },
  },
  legal: {
    organizerName: "Zeta Market SARL",
    links: [
      { id: "l-1", kind: "terms", label: { fr: "Règlement" } },
      {
        id: "l-2",
        kind: "support",
        label: { fr: "Support" },
        url: "mailto:support@example.com",
      },
    ],
    legalLine: { fr: "Jeu gratuit sans obligation d'achat." },
    termsBody: { fr: "Mentions légales complètes." },
  },
  game: {
    type: "lucky_wheel",
    teaser: { mode: "attract", caption: null },
    wheel: {
      segments: [
        {
          id: "s-1",
          prizeId: "p-1",
          label: { fr: "5000 DA" },
          color: null,
          icon: "coins",
        },
        {
          id: "s-2",
          prizeId: null,
          label: { fr: "Rejouez" },
          color: "#334155",
          icon: null,
        },
      ],
      hubLabel: { fr: "JOUER" },
    },
    scratch: {
      coverImage: null,
      coverText: { fr: "Grattez ici" },
      revealThresholdPercent: 50,
    },
    boxes: { count: 3, icon: "gift", color: null },
    quiz: {
      translations: {
        "q-1": {
          sourceHash: "a1b2c3",
          text: { ar: "ما هو رمز الاتصال بالجزائر؟" },
          options: [{ ar: "+213" }, { ar: "+212" }],
        },
      },
    },
    hitIt: { targetIcon: "target", targetImage: null },
  },
  prizeDisplay: {
    "p-1": {
      label: { fr: "Panier 5000 DA" },
      winMessage: { fr: "Votre panier vous attend !" },
      icon: "gift",
      image: null,
    },
  },
  features: { sound: true, animations: true, shareBonus: false },
};

const sampleSnapshot: CampaignSnapshot = {
  id: "c-123",
  name: "Rentrée Zeta",
  gameType: "lucky_wheel",
  status: "active",
  prizes: [{ id: "p-1", name: "Panier 5 000 DA", winMessage: null }],
  quiz: [{ id: "q-1", text: "Indicatif ?", options: ["+213", "+212"] }],
  rules: {
    quiz: { passThresholdPercent: 50, secondsPerQuestion: 0 },
    hitIt: { winThreshold: 8, durationSeconds: 10 },
  },
};

describe("ExperienceConfig", () => {
  it("survives a JSON round trip unchanged", () => {
    expect(JSON.parse(JSON.stringify(sampleConfig))).toEqual(sampleConfig);
  });

  // The assertions below are checked by the TypeScript compiler (npm run typecheck).
  it("only holds JSON values", () => {
    expectTypeOf<IsJson<ExperienceConfig>>().toEqualTypeOf<true>();
  });

  it("keeps game rules out of the configuration", () => {
    expectTypeOf<keyof NonNullable<GameSettings["hitIt"]>>().toEqualTypeOf<
      "targetIcon" | "targetImage"
    >();
    expectTypeOf<
      keyof NonNullable<GameSettings["quiz"]>
    >().toEqualTypeOf<"translations">();
  });

  it("locks the share bonus to false", () => {
    expectTypeOf<
      ExperienceConfig["features"]["shareBonus"]
    >().toEqualTypeOf<false>();
  });
});

describe("CampaignSnapshot", () => {
  it("survives a JSON round trip unchanged", () => {
    expect(JSON.parse(JSON.stringify(sampleSnapshot))).toEqual(sampleSnapshot);
  });

  it("only holds JSON values", () => {
    expectTypeOf<IsJson<CampaignSnapshot>>().toEqualTypeOf<true>();
  });

  it("uses the campaign status values", () => {
    expectTypeOf<CampaignSnapshot["status"]>().toEqualTypeOf<
      Campaign["status"]
    >();
  });
});

describe("IsJson", () => {
  it("rejects functions, dates and nested functions", () => {
    expectTypeOf<IsJson<{ onClick: () => void }>>().toEqualTypeOf<false>();
    expectTypeOf<IsJson<{ at: Date }>>().toEqualTypeOf<false>();
    expectTypeOf<
      IsJson<{ items: { run: () => void }[] }>
    >().toEqualTypeOf<false>();
    expectTypeOf<
      IsJson<{ name: string; tags: string[] }>
    >().toEqualTypeOf<true>();
  });
});
