import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParseResult } from "../../domain/schema";
import type { ExperienceConfig } from "../../domain/types";
import type {
  ExperienceRepository,
  ExperienceScope,
  RepositoryError,
  RepositoryErrorCode,
  SaveResult,
} from "../ports";
import { readStoredExperience } from "../storedExperience";

// ExperienceRepository on the campaign_experiences table (backend task B3.1): one row per
// campaign, the whole configuration in `config`. Reads go through RLS (members of the
// campaign's organization); writes go through the save_experience_config function, which
// owns updatedAt and refuses a save made on an outdated version (CONFLICT).
//
// Standalone configurations (campaignId null) are never stored here: the Studio keeps them
// in the browser (local repository).

export const EXPERIENCE_TABLE = "campaign_experiences";
export const SAVE_FUNCTION = "save_experience_config";

const MESSAGES: Record<RepositoryErrorCode, string> = {
  CONFLICT:
    "This design was saved meanwhile elsewhere (another tab, window or teammate). Reload it to get the latest version, then save again.",
  STORAGE_FULL:
    "This design is too large to save, usually because of embedded images. Replace them with uploaded images, then save again.",
  STORAGE_UNAVAILABLE:
    "The design could not be saved to the server. Check your connection and your access to this campaign, then retry.",
};

const failure = (code: RepositoryErrorCode): SaveResult => {
  const error: RepositoryError = { code, message: MESSAGES[code] };
  return { ok: false, error };
};

// What save_experience_config answers.
type SaveResponse =
  | { ok: true; config: { updatedAt?: unknown } }
  | { ok: false; code: "INVALID" | "TOO_LARGE" | "NOT_FOUND" | "CONFLICT" };

function isSaveResponse(value: unknown): value is SaveResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { ok?: unknown }).ok === "boolean"
  );
}

export interface SupabaseExperienceRepositoryOptions {
  client: SupabaseClient;
  warn?: (message: string) => void;
}

export function createSupabaseExperienceRepository(
  options: SupabaseExperienceRepositoryOptions,
): ExperienceRepository {
  const { client } = options;
  const warn = options.warn ?? ((message: string) => console.warn(message));

  return {
    // Throws when the server cannot be read: returning null would make the Studio start from
    // the defaults and save them over the real design.
    async load(scope: ExperienceScope): Promise<ParseResult | null> {
      if (scope.campaignId === null) return null;
      const { data, error } = await client
        .from(EXPERIENCE_TABLE)
        .select("config")
        .eq("campaign_id", scope.campaignId)
        .maybeSingle();
      if (error) {
        throw new Error(`Could not load the saved design: ${error.message}`);
      }
      if (!data) return null;
      const result = readStoredExperience(
        (data as { config: unknown }).config,
        scope,
      );
      if (result.issues.length > 0) {
        warn(
          `[player-experience] The configuration stored for campaign "${scope.campaignId}" was repaired: ${result.issues.join("; ")}`,
        );
      }
      return result;
    },

    async save(
      config: ExperienceConfig,
      { expectedUpdatedAt }: { expectedUpdatedAt?: string } = {},
    ): Promise<SaveResult> {
      if (config.campaignId === null) return failure("STORAGE_UNAVAILABLE");
      let response: unknown;
      try {
        const { data, error } = await client.rpc(SAVE_FUNCTION, {
          p_campaign_id: config.campaignId,
          p_config: config,
          p_expected_updated_at: expectedUpdatedAt ?? null,
        });
        if (error) return failure("STORAGE_UNAVAILABLE");
        response = data;
      } catch {
        return failure("STORAGE_UNAVAILABLE"); // network failure
      }
      if (!isSaveResponse(response)) return failure("STORAGE_UNAVAILABLE");
      if (response.ok === false) {
        if (response.code === "CONFLICT") return failure("CONFLICT");
        if (response.code === "TOO_LARGE") return failure("STORAGE_FULL");
        return failure("STORAGE_UNAVAILABLE"); // NOT_FOUND, INVALID
      }
      const updatedAt = response.config.updatedAt;
      if (typeof updatedAt !== "string") return failure("STORAGE_UNAVAILABLE");
      // The server only sets updatedAt and campaignId: the rest is what was sent.
      return { ok: true, config: { ...config, updatedAt } };
    },

    async remove(scope: ExperienceScope): Promise<void> {
      if (scope.campaignId === null) return;
      const { error } = await client
        .from(EXPERIENCE_TABLE)
        .delete()
        .eq("campaign_id", scope.campaignId);
      if (error) {
        warn(
          `[player-experience] The design of campaign "${scope.campaignId}" could not be removed: ${error.message}`,
        );
      }
    },
  };
}
