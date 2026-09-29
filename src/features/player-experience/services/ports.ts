import type { FlowScreen } from "../domain/flow";
import type { GameType } from "../domain/gameTypes";
import type { Locale } from "../domain/locale";
import type {
  Availability,
  DrawRequest,
  DrawResult,
  ParticipationError,
} from "../domain/participation";
import type { ParseResult } from "../domain/schema";
import type { AssetRef, ExperienceConfig } from "../domain/types";

// Ports: what the experience needs from the outside world, as interfaces only.
// Adapters implement them (services/local now, services/supabase after the MVP) and are
// injected through ServicesProvider (T2.6): the runtime never picks one itself.
//
// Expected failures (a conflict, a full storage, a refused file) are returned as values,
// like DrawResult, never thrown: callers must handle them, and TypeScript makes sure they do.

// ── Configuration storage ───────────────────────────────────────────────────

export interface ExperienceScope {
  campaignId: string | null; // null = standalone (demo campaign)
  fallbackGameType?: GameType; // game of a configuration rebuilt from unreadable data
}

export type RepositoryErrorCode =
  | "CONFLICT" // saved meanwhile elsewhere (another tab): reload before saving
  | "STORAGE_FULL" // quota exceeded, usually because of large images
  | "STORAGE_UNAVAILABLE"; // storage blocked or disabled (private browsing, policy)

export interface RepositoryError {
  code: RepositoryErrorCode;
  message: string; // Studio label, in English
}

export type SaveResult =
  | { ok: true; config: ExperienceConfig } // as stored, with its new updatedAt
  | { ok: false; error: RepositoryError };

export interface ExperienceRepository {
  // null when nothing is stored. A stored configuration always comes back usable:
  // migrated, validated and repaired, with the problems listed (ParseResult, T1.6).
  load(scope: ExperienceScope): Promise<ParseResult | null>;
  // Optimistic concurrency: with expectedUpdatedAt, the save is refused (CONFLICT) if the
  // stored configuration has changed since it was loaded.
  save(
    config: ExperienceConfig,
    options?: { expectedUpdatedAt?: string },
  ): Promise<SaveResult>;
  remove(scope: ExperienceScope): Promise<void>;
}

// ── Participation ───────────────────────────────────────────────────────────

export type GatewayMode = "demo" | "scripted" | "live";

// Defined in the domain (the public campaign read carries it), re-exported here as before.
export type { Availability };

export type ConfirmCouponResult =
  { ok: true } | { ok: false; error: ParticipationError };

// The only authority on outcomes. "live" is the select-prize Edge Function; "demo" and
// "scripted" simulate it in the Studio and are refused on the public player route.
export interface ParticipationGateway {
  readonly mode: GatewayMode;
  checkAvailability(campaignId: string): Promise<Availability>;
  draw(request: DrawRequest): Promise<DrawResult>;
  confirmCoupon(entryId: string): Promise<ConfirmCouponResult>;
}

// ── Images ──────────────────────────────────────────────────────────────────

export type AssetPurpose = "logo" | "background" | "scratchCover";

export type AssetErrorCode =
  | "NOT_AN_IMAGE"
  | "TOO_LARGE" // still over the size limit after compression
  | "UNREADABLE"; // the file could not be decoded

export interface AssetError {
  code: AssetErrorCode;
  message: string; // Studio label, in English
}

export type UploadResult =
  { ok: true; asset: AssetRef } | { ok: false; error: AssetError };

export interface AssetStorage {
  upload(file: File, purpose: AssetPurpose): Promise<UploadResult>;
  resolveUrl(ref: AssetRef): string | null; // URL usable in <img src>, null if none
}

// ── Analytics ───────────────────────────────────────────────────────────────

export type ExperienceEventName =
  | "experience_viewed"
  | "cta_clicked"
  | "form_submitted"
  | "form_invalid"
  | "consent_opened"
  | "game_started"
  | "draw_requested"
  | "outcome_received"
  | "reveal_completed"
  | "coupon_copied"
  | "coupon_confirmed"
  | "share_clicked"
  | "error_shown";

export interface ExperienceEvent {
  name: ExperienceEventName;
  at: string; // ISO 8601
  campaignId: string | null;
  sessionId: string;
  screen: FlowScreen;
  locale: Locale;
  // Flat values only, never personal data (no phone, name or email).
  data?: Record<string, string | number | boolean | null>;
}

export interface AnalyticsTracker {
  track(event: ExperienceEvent): void; // fire-and-forget: never blocks nor breaks the journey
}

// ── Human verification ──────────────────────────────────────────────────────

export interface HumanVerification {
  getToken(): Promise<string | null>; // MVP: always null (no captcha yet)
}

// ── All services, as injected by ServicesProvider ──────────────────────────

export interface ExperienceServices {
  repository: ExperienceRepository;
  participation: ParticipationGateway;
  assets: AssetStorage;
  analytics: AnalyticsTracker;
  humanVerification: HumanVerification;
}
