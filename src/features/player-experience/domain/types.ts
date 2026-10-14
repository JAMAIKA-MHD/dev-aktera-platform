import type { GameType } from "./gameTypes";
import type { IconName } from "./icons";
import type { Locale, LocalizedText } from "./locale";

// Everything in this file is plain JSON: no functions, no React nodes, no Date objects
// (types.test.ts fails otherwise). Behavior lives in the flow state machine, not here.

export type { IconName };

export type AssetRef =
  | { kind: "dataUrl"; url: string } // uploaded file, compressed (MVP)
  | { kind: "remote"; url: string } // https URL typed by the brand
  | { kind: "storage"; bucket: string; path: string } // Supabase Storage (after the MVP)
  | null;

export interface ThemeTokens {
  presetId: string | null;
  mode: "dark" | "light";
  colors: {
    primary: string; // buttons, highlights
    secondary: string; // wheel segments, gradients
    accent: string; // positive states, details
    surface: string; // base background
    text: string;
  };
  background: {
    kind: "solid" | "gradient" | "mesh" | "dots" | "image";
    image: AssetRef;
    overlayOpacity: number; // 0–1: veil that keeps text readable over an image
    focus: { x: number; y: number }; // 0–100: point of interest kept visible whatever the crop
  };
  radius: "sharp" | "rounded" | "pill";
  font: "poppins" | "plus-jakarta"; // Latin script only: Arabic always uses Noto Sans Arabic
}

export type ScreenKey = "welcome" | "register" | "play" | "win" | "lose";

export interface ScreenContent {
  showHeader: boolean;
  hero: "none" | "badge" | "trophy" | "gift" | "timer";
  title: LocalizedText; // 2 lines max (checked by the design validation)
  subtitle: LocalizedText;
  reinforcement: {
    kind: "none" | "attempts" | "timer" | "progress" | "hint";
    text: LocalizedText;
  };
  primaryCta: LocalizedText;
  secondaryCta: LocalizedText | null;
}

export interface JackpotSection {
  enabled: boolean;
  eyebrow: LocalizedText;
  title: LocalizedText;
  badge: LocalizedText; // empty = no badge
  icon: IconName;
}

export interface PrizeChip {
  id: string;
  icon: IconName;
  value: LocalizedText;
  caption: LocalizedText;
  tone: "primary" | "secondary" | "accent";
}

export interface PrizeChipsSection {
  enabled: boolean;
  items: PrizeChip[]; // 1 to 4
}

export type FormFieldKey = "fullName" | "phone" | "email" | "wilaya";

export interface FormField {
  key: FormFieldKey;
  enabled: boolean; // always true for "phone": it is the anti-duplicate key
  required: boolean; // always true for "phone"
  label: LocalizedText;
  placeholder: LocalizedText;
}

export interface FormConfig {
  fields: FormField[];
  consent: {
    text: LocalizedText; // always shown, never pre-checked (Law 18-07)
    policyVersion: string; // stored with each consent, e.g. "2026-09-01"
  };
}

export interface LegalLink {
  id: string;
  kind: "terms" | "privacy" | "support" | "url";
  label: LocalizedText;
  url?: string; // https:, mailto: or tel: only
}

export interface LegalConfig {
  organizerName: string;
  links: LegalLink[];
  showLegalLine: boolean; // the short mention scrolls above the footer links (the client's choice)
  legalLine: LocalizedText; // short footer mention / scrolling banner
  termsBody: LocalizedText; // full text of the legal sheet
}

export interface WheelSegment {
  id: string;
  prizeId: string | null; // campaign prize (prizes.id); null = losing segment
  label: LocalizedText; // empty = the prize display label
  color: string | null; // null = derived from the theme
  icon: IconName | null;
}

export interface QuizQuestionTranslation {
  sourceHash: string; // fingerprint of the source text: flags a translation made outdated by a Wizard edit
  text: LocalizedText;
  options: LocalizedText[]; // same count and order as the options stored in the database
}

// Game PRESENTATION only. Rules that decide a win (prizes, weights, stock, win probability,
// questions and correct answers, thresholds, durations) live in the campaign, never here.
export interface GameSettings {
  type: GameType; // = the campaign game type, chosen in the Wizard
  teaser: {
    mode: "attract" | "static"; // animated pregame simulation or still image
    caption: LocalizedText | null; // null = caption generated from the campaign
  };
  wheel?: {
    segments: WheelSegment[]; // 4 to 12, all the same visual size
    hubLabel: LocalizedText;
  };
  scratch?: {
    coverImage: AssetRef;
    coverText: LocalizedText;
    revealThresholdPercent: number;
  };
  boxes?: { count: 3; icon: IconName; color: string | null };
  quiz?: {
    // Display translations of the campaign questions, keyed by quiz_questions.id.
    // Never contains the correct answer.
    translations: Record<string, QuizQuestionTranslation>;
  };
  hitIt?: { targetIcon: IconName; targetImage: AssetRef };
}

// How a campaign prize is shown, per language. Empty values fall back to prizes.name and prizes.win_message.
export interface PrizeDisplay {
  label: LocalizedText;
  winMessage: LocalizedText;
  icon: IconName | null;
  image: AssetRef;
}

export interface ExperienceConfig {
  schemaVersion: 1;
  id: string; // UUID
  campaignId: string | null; // null = standalone (demo campaign)
  templateId: "eight-slot"; // single template in the MVP
  updatedAt: string; // ISO 8601
  locales: { default: Locale; enabled: Locale[] };
  theme: ThemeTokens;
  brand: {
    name: string;
    logo: AssetRef;
    logoIcon: IconName; // shown when there is no logo image
    tagline: LocalizedText;
  };
  screens: Record<ScreenKey, ScreenContent>;
  sections: { jackpot: JackpotSection; prizeChips: PrizeChipsSection };
  form: FormConfig;
  legal: LegalConfig;
  game: GameSettings;
  prizeDisplay: Record<string, PrizeDisplay>; // keyed by prizes.id
  features: {
    sound: boolean;
    animations: boolean;
    shareBonus: false; // locked: "+1 try for a share" stays off until the server can verify shares
  };
}
