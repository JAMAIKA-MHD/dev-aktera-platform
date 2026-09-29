import type { ParseResult } from "../../domain/schema";
import type { ExperienceConfig } from "../../domain/types";
import { readStoredExperience } from "../storedExperience";
import type {
  ExperienceRepository,
  ExperienceScope,
  RepositoryError,
  RepositoryErrorCode,
  SaveResult,
} from "../ports";

// ExperienceRepository on top of localStorage (plan §7.3): one key per campaign, the
// configuration as JSON. Loading never destroys anything: a repaired configuration is only
// written back when the Studio saves it.

export const EXPERIENCE_KEY_PREFIX = "xp:experience:v1:";

export function experienceStorageKey(campaignId: string | null): string {
  return `${EXPERIENCE_KEY_PREFIX}${campaignId ?? "standalone"}`;
}

export interface LocalExperienceRepositoryOptions {
  // A getter, not a value: merely reading window.localStorage throws when storage is blocked.
  getStorage?: () => Storage;
  now?: () => Date;
  warn?: (message: string) => void;
}

const MESSAGES: Record<RepositoryErrorCode, string> = {
  CONFLICT:
    "This experience was saved meanwhile in another tab or window. Reload it to get the latest version, then save again.",
  STORAGE_FULL:
    "The browser storage is full, usually because of large images. Remove or replace an image, then save again.",
  STORAGE_UNAVAILABLE:
    "The browser blocks local storage (private browsing or site settings): changes cannot be saved.",
};

const failure = (code: RepositoryErrorCode): SaveResult => {
  const error: RepositoryError = { code, message: MESSAGES[code] };
  return { ok: false, error };
};

// Chrome, Safari and Edge name it QuotaExceededError; older Firefox versions use another name.
function isQuotaExceeded(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED"
  );
}

// updatedAt of the stored configuration, or null if there is none or it cannot be read.
function storedUpdatedAt(raw: string | null): string | null {
  if (raw === null) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data === "object" && data !== null && "updatedAt" in data) {
      return typeof data.updatedAt === "string" ? data.updatedAt : null;
    }
  } catch {
    // Unreadable: nothing to compare with, the save may replace it.
  }
  return null;
}

// Always later than the stored value, even for two saves in the same millisecond:
// otherwise another tab could miss a change.
function nextUpdatedAt(now: Date, previous: string | null): string {
  const before = previous === null ? Number.NaN : Date.parse(previous);
  const at = Number.isFinite(before)
    ? Math.max(now.getTime(), before + 1)
    : now.getTime();
  return new Date(at).toISOString();
}

export function createLocalExperienceRepository(
  options: LocalExperienceRepositoryOptions = {},
): ExperienceRepository {
  const getStorage = options.getStorage ?? (() => globalThis.localStorage);
  const now = options.now ?? (() => new Date());
  const warn = options.warn ?? ((message: string) => console.warn(message));

  return {
    async load(scope: ExperienceScope): Promise<ParseResult | null> {
      const key = experienceStorageKey(scope.campaignId);
      let raw: string | null;
      try {
        raw = getStorage().getItem(key);
      } catch {
        return null; // blocked storage: nothing can be read, the Studio starts from defaults
      }
      if (raw === null) return null;

      const jsonIssues: string[] = [];
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        jsonIssues.push("(root): the stored value is not valid JSON");
      }
      // Migrates older versions, validates and repairs (T1.6, T1.9), then checks the campaign.
      const result = readStoredExperience(data, scope, jsonIssues);
      if (result.issues.length > 0) {
        warn(
          `[player-experience] The configuration stored under "${key}" was repaired: ${result.issues.join("; ")}`,
        );
      }
      return result;
    },

    async save(
      config: ExperienceConfig,
      { expectedUpdatedAt }: { expectedUpdatedAt?: string } = {},
    ): Promise<SaveResult> {
      const key = experienceStorageKey(config.campaignId);
      try {
        const storage = getStorage();
        const previous = storedUpdatedAt(storage.getItem(key));
        // Optimistic concurrency: refuse to overwrite a newer save made elsewhere.
        if (
          expectedUpdatedAt !== undefined &&
          previous !== null &&
          previous !== expectedUpdatedAt
        ) {
          return failure("CONFLICT");
        }
        const json = JSON.stringify({
          ...config,
          updatedAt: nextUpdatedAt(now(), previous),
        });
        storage.setItem(key, json);
        return { ok: true, config: JSON.parse(json) as ExperienceConfig };
      } catch (error) {
        return failure(
          isQuotaExceeded(error) ? "STORAGE_FULL" : "STORAGE_UNAVAILABLE",
        );
      }
    },

    async remove(scope: ExperienceScope): Promise<void> {
      try {
        getStorage().removeItem(experienceStorageKey(scope.campaignId));
      } catch {
        // Blocked storage: there is nothing stored to remove.
      }
    },
  };
}
