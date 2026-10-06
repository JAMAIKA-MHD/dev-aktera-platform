import type { ParseResult } from "../../domain/schema";
import type { ExperienceRepository, ExperienceScope } from "../ports";

// One-off import of the designs made before the Studio saved to Supabase (backend task B4.3):
// they only exist in the browser that made them (localStorage). When the server has no design
// for a campaign and this browser has one, it is sent to the server once, then served from it.
//
// A marker per campaign (xp:experience:imported:<campaignId>) prevents importing again a design
// that was imported, or deliberately removed from the server. The local copy is never deleted:
// it stays as a safety net. Images keep their data URLs (they still show; no conversion).

export const IMPORTED_KEY_PREFIX = "xp:experience:imported:";

export function importedMarkerKey(campaignId: string): string {
  return `${IMPORTED_KEY_PREFIX}${campaignId}`;
}

export interface ImportingExperienceRepositoryOptions {
  remote: ExperienceRepository;
  local: ExperienceRepository;
  // A getter, not a value: merely reading window.localStorage throws when storage is blocked.
  getStorage?: () => Storage;
  warn?: (message: string) => void;
}

export function createImportingExperienceRepository(
  options: ImportingExperienceRepositoryOptions,
): ExperienceRepository {
  const { remote, local } = options;
  const getStorage = options.getStorage ?? (() => globalThis.localStorage);
  const warn = options.warn ?? ((message: string) => console.warn(message));

  const isMarked = (campaignId: string) => {
    try {
      return getStorage().getItem(importedMarkerKey(campaignId)) !== null;
    } catch {
      return true; // blocked storage: nothing local to import anyway
    }
  };
  const mark = (campaignId: string) => {
    try {
      getStorage().setItem(
        importedMarkerKey(campaignId),
        new Date().toISOString(),
      );
    } catch {
      // Blocked storage: the import may be offered again, which is harmless.
    }
  };

  return {
    async load(scope: ExperienceScope): Promise<ParseResult | null> {
      // A server error is thrown on purpose (the Studio must not start from the defaults).
      const stored = await remote.load(scope);
      if (stored !== null || scope.campaignId === null) return stored;
      if (isMarked(scope.campaignId)) return null;

      const legacy = await local.load(scope);
      if (legacy === null) return null;

      const saved = await remote.save(legacy.config);
      if (saved.ok === false) {
        // Not imported (too large, server unavailable): the brand keeps working on it, and the
        // next autosave, or the next opening, sends it again.
        warn(
          `[player-experience] The design saved in this browser for campaign "${scope.campaignId}" could not be imported: ${saved.error.message}`,
        );
        return legacy;
      }
      mark(scope.campaignId);
      return { ...legacy, config: saved.config };
    },

    save: (config, saveOptions) => remote.save(config, saveOptions),

    async remove(scope: ExperienceScope): Promise<void> {
      await remote.remove(scope);
      // Removed on purpose: never bring the browser's copy back.
      if (scope.campaignId !== null) mark(scope.campaignId);
    },
  };
}
