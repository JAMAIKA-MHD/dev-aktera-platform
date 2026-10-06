import type { ParseResult } from "../domain/schema";
import type { ExperienceRepository } from "../services/ports";
import type { StudioStore } from "./store";

// Reopening the Studio gives back what the autosave wrote (tasks.md T6.1). The stored
// configuration arrives migrated and repaired (T1.6, T1.9); it becomes the starting point of
// the history, not a step of it. With nothing stored, the store keeps its defaults.
export async function loadIntoStudio(
  store: StudioStore,
  repository: ExperienceRepository,
): Promise<ParseResult | null> {
  const { campaignId, campaign, config } = store.getState();
  const loaded = await repository.load({
    campaignId,
    fallbackGameType: campaign?.gameType ?? config.game.type,
  });
  if (loaded) store.getState().hydrate(loaded.config, loaded.config.updatedAt);
  return loaded;
}
