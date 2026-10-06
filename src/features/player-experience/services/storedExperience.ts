import { parseExperienceConfig, type ParseResult } from "../domain/schema";
import type { ExperienceScope } from "./ports";

// A stored configuration made usable: migrated, validated and repaired (parseExperienceConfig,
// T1.6), and attached to the campaign it was stored for. Shared by the local and Supabase
// repositories, so both repair the same way. `issues` are problems already found by the caller
// (unreadable JSON, for instance).
export function readStoredExperience(
  data: unknown,
  scope: ExperienceScope,
  issues: readonly string[] = [],
): ParseResult {
  const parsed = parseExperienceConfig(data, scope.fallbackGameType);
  const allIssues = [...issues, ...parsed.issues];
  let config = parsed.config;
  if (config.campaignId !== scope.campaignId) {
    allIssues.push(
      `campaignId: ${JSON.stringify(config.campaignId)} does not match the storage key, set to ${JSON.stringify(scope.campaignId)}`,
    );
    config = { ...config, campaignId: scope.campaignId };
  }
  return { config, issues: allIssues, recovered: allIssues.length > 0 };
}
