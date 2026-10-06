import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import type { ExperienceConfig } from "../../domain/types";
import type { ExperienceRepository } from "../ports";
import {
  createLocalExperienceRepository,
  experienceStorageKey,
} from "./localExperienceRepository";

// In-memory Storage, able to simulate a full or a blocked browser storage.
class FakeStorage implements Storage {
  private items = new Map<string, string>();
  failure: "quota" | "firefox-quota" | "blocked" | null = null;

  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.failure === "quota") {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    if (this.failure === "firefox-quota") {
      throw new DOMException("Quota reached", "NS_ERROR_DOM_QUOTA_REACHED");
    }
    if (this.failure === "blocked") {
      throw new DOMException("Access denied", "SecurityError");
    }
    this.items.set(key, value);
  }
}

const T0 = new Date("2026-09-21T18:00:00.000Z");

function setup(start: Date = T0) {
  const storage = new FakeStorage();
  let clock = start.getTime();
  const warnings: string[] = [];
  const repository = createLocalExperienceRepository({
    getStorage: () => storage,
    now: () => new Date(clock),
    warn: (message) => warnings.push(message),
  });
  return {
    storage,
    repository,
    warnings,
    tick: (ms: number) => (clock += ms),
  };
}

const quizConfig = (campaignId: string | null = "campaign-1") =>
  createDefaultExperience({
    gameType: "quiz",
    campaign: campaignId
      ? {
          id: campaignId,
          name: "Summer quiz",
          gameType: "quiz",
          status: "active",
          prizes: [],
          quiz: [],
          rules: {},
        }
      : null,
  });

const saved = async (
  repository: ExperienceRepository,
  config: ExperienceConfig,
) => {
  const result = await repository.save(config);
  if (result.ok === false) throw new Error(result.error.message);
  return result.config;
};

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("experienceStorageKey", () => {
  it("uses one versioned key per campaign, and one for standalone", () => {
    expect(experienceStorageKey("campaign-1")).toBe(
      "xp:experience:v1:campaign-1",
    );
    expect(experienceStorageKey(null)).toBe("xp:experience:v1:standalone");
  });
});

describe("load and save", () => {
  it("returns null when nothing is stored", async () => {
    const { repository } = setup();
    expect(await repository.load({ campaignId: "campaign-1" })).toBeNull();
  });

  it("gives back exactly what was saved", async () => {
    const { repository, storage, warnings } = setup();
    const config = quizConfig();
    config.screens.welcome.title = {
      fr: "Notre quiz",
      ar: "مسابقتنا",
      en: "Our quiz",
    };
    const stored = await saved(repository, config);
    expect(storage.getItem("xp:experience:v1:campaign-1")).toBe(
      JSON.stringify(stored),
    );
    const loaded = await repository.load({ campaignId: "campaign-1" });
    expect(loaded).toEqual({ config: stored, issues: [], recovered: false });
    expect(stored).toEqual({ ...config, updatedAt: T0.toISOString() });
    expect(warnings).toEqual([]);
  });

  it("stamps updatedAt without changing the given configuration", async () => {
    const { repository, tick } = setup();
    const config = quizConfig();
    const before = structuredClone(config);
    const first = await saved(repository, config);
    tick(5_000);
    const second = await saved(repository, first);
    expect(first.updatedAt).toBe("2026-09-21T18:00:00.000Z");
    expect(second.updatedAt).toBe("2026-09-21T18:00:05.000Z");
    expect(config).toEqual(before);
  });

  it("always moves updatedAt forward, even within the same millisecond", async () => {
    const { repository } = setup();
    const first = await saved(repository, quizConfig());
    const second = await saved(repository, first);
    expect(second.updatedAt).toBe("2026-09-21T18:00:00.001Z");
  });

  it("keeps campaigns and the standalone configuration apart", async () => {
    const { repository } = setup();
    await saved(repository, quizConfig("campaign-1"));
    await saved(repository, quizConfig(null));
    expect(
      (await repository.load({ campaignId: "campaign-1" }))?.config.campaignId,
    ).toBe("campaign-1");
    expect(
      (await repository.load({ campaignId: null }))?.config.campaignId,
    ).toBeNull();
    expect(await repository.load({ campaignId: "campaign-2" })).toBeNull();
  });

  it("removes a stored configuration", async () => {
    const { repository } = setup();
    await saved(repository, quizConfig());
    await repository.remove({ campaignId: "campaign-1" });
    expect(await repository.load({ campaignId: "campaign-1" })).toBeNull();
  });

  it("uses the browser localStorage by default", async () => {
    const repository = createLocalExperienceRepository();
    const stored = await saved(repository, quizConfig());
    expect(localStorage.getItem("xp:experience:v1:campaign-1")).toBe(
      JSON.stringify(stored),
    );
    expect(
      (await repository.load({ campaignId: "campaign-1" }))?.config,
    ).toEqual(stored);
  });
});

describe("damaged or older data", () => {
  it("rebuilds a default configuration from corrupted JSON, and says so", async () => {
    const { repository, storage, warnings } = setup();
    storage.setItem("xp:experience:v1:campaign-1", "{not json");
    const loaded = await repository.load({
      campaignId: "campaign-1",
      fallbackGameType: "hit_it",
    });
    expect(loaded?.recovered).toBe(true);
    expect(loaded?.issues[0]).toBe(
      "(root): the stored value is not valid JSON",
    );
    expect(loaded?.config.game.type).toBe("hit_it"); // the campaign's game
    expect(loaded?.config.campaignId).toBe("campaign-1");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('"xp:experience:v1:campaign-1" was repaired');
    // Nothing is overwritten until the Studio saves.
    expect(storage.getItem("xp:experience:v1:campaign-1")).toBe("{not json");
  });

  it("repairs a damaged field and keeps the rest", async () => {
    const { repository, storage } = setup();
    const config = quizConfig();
    config.screens.welcome.title = { fr: "Notre quiz" };
    storage.setItem(
      "xp:experience:v1:campaign-1",
      JSON.stringify({ ...config, theme: { ...config.theme, radius: "blob" } }),
    );
    const loaded = await repository.load({ campaignId: "campaign-1" });
    expect(loaded?.recovered).toBe(true);
    expect(
      loaded?.issues.some((issue) => issue.startsWith("theme.radius")),
    ).toBe(true);
    expect(loaded?.config.theme.radius).toBe("pill");
    expect(loaded?.config.screens.welcome.title).toEqual({ fr: "Notre quiz" });
  });

  it("migrates an older version silently", async () => {
    const { repository, storage, warnings } = setup();
    const { schemaVersion: _version, ...v0 } = quizConfig();
    storage.setItem("xp:experience:v1:campaign-1", JSON.stringify(v0));
    const loaded = await repository.load({ campaignId: "campaign-1" });
    expect(loaded).toMatchObject({ issues: [], recovered: false });
    expect(loaded?.config.schemaVersion).toBe(1);
    expect(warnings).toEqual([]);
  });

  it("aligns a configuration stored under another campaign's key", async () => {
    const { repository, storage } = setup();
    storage.setItem(
      "xp:experience:v1:campaign-2",
      JSON.stringify(quizConfig("campaign-1")),
    );
    const loaded = await repository.load({ campaignId: "campaign-2" });
    expect(loaded?.config.campaignId).toBe("campaign-2");
    expect(loaded?.recovered).toBe(true);
    expect(loaded?.issues).toEqual([
      'campaignId: "campaign-1" does not match the storage key, set to "campaign-2"',
    ]);
  });
});

describe("two tabs", () => {
  it("refuses to overwrite a newer save made in another tab", async () => {
    const { repository, storage, tick } = setup();
    const original = await saved(repository, quizConfig());
    // Tab A and tab B both loaded `original`. Tab B saves first.
    tick(1_000);
    const tabB = await saved(repository, {
      ...original,
      brand: { ...original.brand, name: "Tab B" },
    });
    tick(1_000);
    const tabA = await repository.save(
      { ...original, brand: { ...original.brand, name: "Tab A" } },
      { expectedUpdatedAt: original.updatedAt },
    );
    expect(tabA).toEqual({
      ok: false,
      error: {
        code: "CONFLICT",
        message: expect.stringContaining("another tab"),
      },
    });
    expect(storage.getItem("xp:experience:v1:campaign-1")).toBe(
      JSON.stringify(tabB),
    );
  });

  it("saves when nothing changed meanwhile, or when no check is asked", async () => {
    const { repository, tick } = setup();
    const original = await saved(repository, quizConfig());
    tick(1_000);
    const checked = await repository.save(original, {
      expectedUpdatedAt: original.updatedAt,
    });
    expect(checked.ok).toBe(true);
    tick(1_000);
    const unchecked = await repository.save(original); // stale, but no check asked
    expect(unchecked.ok).toBe(true);
  });

  it("does not report a conflict when nothing readable is stored", async () => {
    const { repository, storage } = setup();
    storage.setItem("xp:experience:v1:campaign-1", "{not json");
    const result = await repository.save(quizConfig(), {
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    const noUpdatedAt = setup();
    noUpdatedAt.storage.setItem(
      "xp:experience:v1:campaign-1",
      JSON.stringify({ updatedAt: 42 }),
    );
    const again = await noUpdatedAt.repository.save(quizConfig(), {
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(again.ok).toBe(true);
  });
});

describe("storage problems", () => {
  it("reports a full storage clearly", async () => {
    for (const failure of ["quota", "firefox-quota"] as const) {
      const { repository, storage } = setup();
      storage.failure = failure;
      const result = await repository.save(quizConfig());
      expect(result).toEqual({
        ok: false,
        error: {
          code: "STORAGE_FULL",
          message: expect.stringContaining("storage is full"),
        },
      });
    }
  });

  it("reports a storage that refuses writes", async () => {
    const { repository, storage } = setup();
    storage.failure = "blocked";
    const result = await repository.save(quizConfig());
    expect(result.ok === false ? result.error.code : null).toBe(
      "STORAGE_UNAVAILABLE",
    );
  });

  it("survives a blocked storage: nothing loaded, saves refused, remove ignored", async () => {
    const repository = createLocalExperienceRepository({
      getStorage: () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
    expect(await repository.load({ campaignId: null })).toBeNull();
    const result = await repository.save(quizConfig());
    expect(result).toMatchObject({
      ok: false,
      error: { code: "STORAGE_UNAVAILABLE" },
    });
    await expect(
      repository.remove({ campaignId: null }),
    ).resolves.toBeUndefined();
  });

  it("classifies unknown thrown values as an unavailable storage", async () => {
    const repository = createLocalExperienceRepository({
      getStorage: () => {
        throw "blocked";
      },
    });
    const result = await repository.save(quizConfig());
    expect(result.ok === false ? result.error.code : null).toBe(
      "STORAGE_UNAVAILABLE",
    );
  });

  it("warns in the console by default when a configuration is repaired", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    localStorage.setItem("xp:experience:v1:standalone", "[]");
    const loaded = await createLocalExperienceRepository().load({
      campaignId: null,
    });
    expect(loaded?.recovered).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
  });
});
