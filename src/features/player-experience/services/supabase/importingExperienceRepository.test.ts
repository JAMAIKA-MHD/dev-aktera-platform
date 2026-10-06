import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import type { ParseResult } from "../../domain/schema";
import type { ExperienceConfig } from "../../domain/types";
import type { ExperienceRepository, SaveResult } from "../ports";
import {
  createImportingExperienceRepository,
  importedMarkerKey,
} from "./importingExperienceRepository";

const CAMPAIGN = "11111111-1111-4111-8111-111111111111";

const design = (name: string): ExperienceConfig => {
  const config = createDefaultExperience({ gameType: "lucky_wheel" });
  return { ...config, campaignId: CAMPAIGN, brand: { ...config.brand, name } };
};
const parsed = (config: ExperienceConfig): ParseResult => ({
  config,
  issues: [],
  recovered: false,
});

// A repository whose content and answers the test decides.
function fakeRepository(
  initial: ExperienceConfig | null,
  saveAnswer?: SaveResult,
) {
  let stored = initial;
  const saves: ExperienceConfig[] = [];
  let removed = 0;
  const repository: ExperienceRepository = {
    load: async () => (stored ? parsed(stored) : null),
    save: async (config) => {
      saves.push(config);
      if (saveAnswer) return saveAnswer;
      stored = { ...config, updatedAt: "server-1" };
      return { ok: true, config: stored };
    },
    remove: async () => {
      removed += 1;
      stored = null;
    },
  };
  return { repository, saves, removed: () => removed };
}

function setup(
  remote: ReturnType<typeof fakeRepository>,
  local: ReturnType<typeof fakeRepository>,
) {
  const warnings: string[] = [];
  const repository = createImportingExperienceRepository({
    remote: remote.repository,
    local: local.repository,
    getStorage: () => localStorage,
    warn: (message) => warnings.push(message),
  });
  return { repository, warnings };
}

describe("createImportingExperienceRepository", () => {
  beforeEach(() => localStorage.clear());

  it("uses the server's design when there is one, without looking at the browser", async () => {
    const remote = fakeRepository(design("Server"));
    const local = fakeRepository(design("Browser"));
    const { repository } = setup(remote, local);
    expect(
      (await repository.load({ campaignId: CAMPAIGN }))?.config.brand.name,
    ).toBe("Server");
    expect(remote.saves).toHaveLength(0);
  });

  it("imports this browser's design once when the server has none", async () => {
    const remote = fakeRepository(null);
    const local = fakeRepository(design("Browser"));
    const { repository } = setup(remote, local);

    const first = await repository.load({ campaignId: CAMPAIGN });
    expect(first?.config.brand.name).toBe("Browser");
    expect(first?.config.updatedAt).toBe("server-1"); // the server's version from now on
    expect(remote.saves).toHaveLength(1);
    expect(localStorage.getItem(importedMarkerKey(CAMPAIGN))).not.toBeNull();

    // Served from the server afterwards; the browser's copy is kept.
    const second = await repository.load({ campaignId: CAMPAIGN });
    expect(second?.config.updatedAt).toBe("server-1");
    expect(remote.saves).toHaveLength(1);
    expect(
      await local.repository.load({ campaignId: CAMPAIGN }),
    ).not.toBeNull();
  });

  it("returns null when neither the server nor the browser has a design", async () => {
    const { repository } = setup(fakeRepository(null), fakeRepository(null));
    expect(await repository.load({ campaignId: CAMPAIGN })).toBeNull();
  });

  it("never brings back a design removed from the server", async () => {
    const remote = fakeRepository(design("Server"));
    const local = fakeRepository(design("Browser"));
    const { repository } = setup(remote, local);
    await repository.remove({ campaignId: CAMPAIGN });
    expect(remote.removed()).toBe(1);
    expect(await repository.load({ campaignId: CAMPAIGN })).toBeNull();
    expect(remote.saves).toHaveLength(0);
  });

  it("keeps working on the browser's design when the import fails, and tries again next time", async () => {
    const remote = fakeRepository(null, {
      ok: false,
      error: { code: "STORAGE_FULL", message: "too large" },
    });
    const local = fakeRepository(design("Browser"));
    const { repository, warnings } = setup(remote, local);
    const loaded = await repository.load({ campaignId: CAMPAIGN });
    expect(loaded?.config.brand.name).toBe("Browser");
    expect(warnings[0]).toContain("could not be imported: too large");
    expect(localStorage.getItem(importedMarkerKey(CAMPAIGN))).toBeNull();
    await repository.load({ campaignId: CAMPAIGN });
    expect(remote.saves).toHaveLength(2);
  });

  it("lets a server error through (the Studio must not start from the defaults)", async () => {
    const remote = fakeRepository(null);
    remote.repository.load = async () => {
      throw new Error("Could not load the saved design: offline");
    };
    const { repository } = setup(remote, fakeRepository(design("Browser")));
    await expect(repository.load({ campaignId: CAMPAIGN })).rejects.toThrow(
      "offline",
    );
  });

  it("delegates saves to the server", async () => {
    const remote = fakeRepository(null);
    const { repository } = setup(remote, fakeRepository(null));
    const result = await repository.save(design("Edited"), {
      expectedUpdatedAt: "x",
    });
    expect(result.ok).toBe(true);
    expect(remote.saves[0].brand.name).toBe("Edited");
  });
});
