// Participation contract with the outcome authority: the demo gateway in the MVP,
// the select-prize Edge Function afterwards. Field-by-field mapping to the select-prize
// request and response: plan.md §7.2 (ai-assistance-prompts-reports/playereditor/plan&tasks/).
import type { Locale, LocalizedText } from "./locale";
import { createUuid } from "./uuid";

export interface ConsentRecord {
  accepted: true; // a participation without consent is never sent
  acceptedAt: string; // ISO 8601
  policyVersion: string;
  locale: Locale;
}

export type GamePayload =
  | { kind: "none" } // wheel, scratch card: drawn before the animation
  | { kind: "quiz"; answers: Record<string, number> } // question id → option index, database order
  | { kind: "boxes"; selectedIndex: number }
  | { kind: "hitIt"; hits: number }
  // Memory Match reports what the player did and how long it took; the server checks the
  // numbers are plausible before it lets them open the prize draw.
  | { kind: "memory"; pairs: number; moves: number; elapsedMs: number }
  // Choose Your Brand: the side picked in each duel, in order, and the product left at the
  // end of a tournament. A preference, never scored.
  | {
      kind: "choices";
      mode: "duels" | "bracket" | "ladder";
      picks: ChoicePick[];
      champion: ChoiceChampion | null; // tournaments only
    };

export interface ChoicePick {
  roundId: string; // the duel: a round id, or a tournament match ("qf1", "sf2", "f1", "m3")
  side: "left" | "right";
  label: string; // the picked side's label as shown, kept with the entry for the brand
  optionId: string | null; // the tournament product picked; null for a fixed duel
}

export interface ChoiceChampion {
  optionId: string;
  label: string;
}

export interface DrawRequest {
  clientRequestId: string; // reused on retry so the same attempt is never counted twice
  campaignId: string;
  participant: {
    phone: string; // normalized with normalizeDzPhone
    fullName?: string;
    email?: string;
    wilaya?: string;
  };
  consent: ConsentRecord;
  gamePayload: GamePayload;
  humanToken: string | null; // captcha token; null until a HumanVerification adapter exists
  context: {
    sessionId: string;
    dwellTimeSeconds: number;
    userAgent: string;
    source: "studio_preview" | "demo" | "web_player";
  };
}

// select-prize returns ALREADY_PARTICIPATED, CAMPAIGN_CLOSED, CAMPAIGN_NOT_STARTED and
// INVALID_INPUT as they are;
// its server-only codes (CONSENT_REQUIRED, DRAW_FAILED, SERVER_ERROR) are mapped onto these by
// the live gateway. NETWORK and UNKNOWN are produced on the client side.
export type ParticipationErrorCode =
  | "ALREADY_PARTICIPATED"
  | "CAMPAIGN_CLOSED"
  // Published but its start date has not come: the page says when it opens, not that it ended.
  | "CAMPAIGN_NOT_STARTED"
  | "INVALID_INPUT"
  | "NETWORK"
  | "UNKNOWN";

export interface ParticipationError {
  code: ParticipationErrorCode;
  message: string;
  /** CAMPAIGN_NOT_STARTED: when the campaign opens (ISO date-time). */
  startsAt?: string;
}

export interface DrawPrize {
  id: string;
  name: string;
  winMessage: string | null;
}

export interface DrawOutcome {
  isWinner: boolean;
  prize: DrawPrize | null;
  couponCode: string | null;
}

// Whether a campaign can still be played, known before any draw (get_public_experience).
export type Availability =
  | { open: true }
  | { open: false; reason: "CLOSED" | "SOLD_OUT" }
  // A scheduled campaign: open from startsAt.
  | { open: false; reason: "NOT_STARTED"; startsAt: string };

export type DrawResult =
  | { ok: true; entryId: string; outcome: DrawOutcome }
  | { ok: false; error: ParticipationError };

export function createClientRequestId(): string {
  return createUuid();
}

// Only technical failures may be retried: a business refusal would fail the same way again.
export function isRetryable(code: ParticipationErrorCode): boolean {
  return code === "NETWORK" || code === "UNKNOWN";
}

export const PARTICIPATION_ERROR_MESSAGES: Readonly<
  Record<ParticipationErrorCode, LocalizedText>
> = {
  ALREADY_PARTICIPATED: {
    fr: "Vous avez déjà participé à cette campagne avec ce numéro.",
    ar: "لقد شاركت بالفعل في هذه الحملة بهذا الرقم.",
    en: "You have already taken part in this campaign with this number.",
  },
  CAMPAIGN_CLOSED: {
    fr: "Cette campagne est terminée. Merci de votre intérêt !",
    ar: "انتهت هذه الحملة. شكراً لاهتمامك!",
    en: "This campaign has ended. Thank you for your interest!",
  },
  CAMPAIGN_NOT_STARTED: {
    fr: "Cette campagne n'a pas encore commencé. Revenez à sa date d'ouverture !",
    ar: "لم تبدأ هذه الحملة بعد. عُد في تاريخ انطلاقها!",
    en: "This campaign has not started yet. Come back when it opens!",
  },
  INVALID_INPUT: {
    fr: "Certaines informations sont invalides. Vérifiez vos coordonnées et réessayez.",
    ar: "بعض المعلومات غير صحيحة. تحقق من بياناتك وحاول مجدداً.",
    en: "Some details are invalid. Check your information and try again.",
  },
  NETWORK: {
    fr: "Connexion impossible. Vérifiez votre réseau et réessayez.",
    ar: "تعذر الاتصال. تحقق من شبكتك وحاول مجدداً.",
    en: "Connection failed. Check your network and try again.",
  },
  UNKNOWN: {
    fr: "Un problème est survenu. Réessayez dans un instant.",
    ar: "حدث خطأ ما. حاول مجدداً بعد قليل.",
    en: "Something went wrong. Please try again in a moment.",
  },
};
