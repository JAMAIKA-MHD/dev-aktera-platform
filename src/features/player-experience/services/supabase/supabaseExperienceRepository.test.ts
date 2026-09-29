import { describe, expect, it } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import type { ExperienceConfig } from "../../domain/types";
import {
  createFakeSupabase,
  type FakeHandlers,
} from "./__tests__/fakeSupabaseClient";
import {
  EXPERIENCE_TABLE,
  SAVE_FUNCTION,
  createSupabaseExperienceRepository,
} from "./supabaseExperienceRepository";

const CAMPAIGN = "11111111-1111-4111-8111-111111111111";

const wheelConfig = (campaignId: string | null = CAMPAIGN): ExperienceConfig =>
  createDefaultExperience({
    gameType: "lucky_wheel",
    campaign: campaignId
      ? {
          id: campaignId,
          name: "Summer wheel",
          gameType: "lucky_wheel",
          status: "active",
          prizes: [],
          quiz: [],
          rules: {},
        }
      : null,
  });

function setup(handlers: FakeHandlers = {}) {
  const fake = createFakeSupabase(handlers);
  const warnings: string[] = [];
  const repository = createSupabaseExperienceRepository({
    client: fake.client,
    warn: (message) => warnings.push(message),
  });
  return { ...fake, repository, warnings };
}

describe("createSupabaseExperienceRepository — load", () => {
  it("returns null for a standalone configuration without asking the server", async () => {
    const { repository, calls } = setup();
    expect(await repository.load({ campaignId: null })).toBeNull();
    expect(calls).toEqual([]);
  });

  it("reads the campaign's row and returns null when there is none", async () => {
    const { repository, calls } = setup({ select: () => ({ data: null }) });
    expect(await repository.load({ campaignId: CAMPAIGN })).toBeNull();
    expect(calls).toEqual([
      {
        kind: "select",
        target: EXPERIENCE_TABLE,
        payload: [["campaign_id", CAMPAIGN]],
      },
    ]);
  });

  it("returns a stored configuration as it is, without warning", async () => {
    const config = wheelConfig();
    const { repository, warnings } = setup({
      select: () => ({ data: { config } }),
    });
    const loaded = await repository.load({ campaignId: CAMPAIGN });
    expect(loaded?.config).toEqual(config);
    expect(loaded?.recovered).toBe(false);
    expect(warnings).toEqual([]);
  });

  it("repairs a damaged configuration and says so", async () => {
    const config = { ...wheelConfig(), theme: "broken" };
    const { repository, warnings } = setup({
      select: () => ({ data: { config } }),
    });
    const loaded = await repository.load({
      campaignId: CAMPAIGN,
      fallbackGameType: "lucky_wheel",
    });
    expect(loaded?.recovered).toBe(true);
    expect(loaded?.config.theme).toEqual(wheelConfig().theme);
    expect(warnings[0]).toContain(`campaign "${CAMPAIGN}" was repaired`);
  });

  it("attaches the configuration to the campaign it was stored for", async () => {
    const config = wheelConfig("22222222-2222-4222-8222-222222222222");
    const { repository } = setup({ select: () => ({ data: { config } }) });
    const loaded = await repository.load({ campaignId: CAMPAIGN });
    expect(loaded?.config.campaignId).toBe(CAMPAIGN);
    expect(loaded?.issues.some((issue) => issue.startsWith("campaignId"))).toBe(
      true,
    );
  });

  it("throws when the server cannot be read, instead of pretending nothing is stored", async () => {
    const { repository } = setup({
      select: () => ({ error: { message: "network down" } }),
    });
    await expect(repository.load({ campaignId: CAMPAIGN })).rejects.toThrow(
      "Could not load the saved design: network down",
    );
  });
});

describe("createSupabaseExperienceRepository — save", () => {
  it("sends the configuration and returns it with the server's updatedAt", async () => {
    const config = wheelConfig();
    const { repository, calls } = setup({
      rpc: (_name, args) => ({
        data: {
          ok: true,
          config: {
            ...(args.p_config as object),
            updatedAt: "2026-09-29T10:00:00.000Z",
          },
        },
      }),
    });
    const result = await repository.save(config, {
      expectedUpdatedAt: "2026-09-29T09:00:00.000Z",
    });
    expect(result).toEqual({
      ok: true,
      config: { ...config, updatedAt: "2026-09-29T10:00:00.000Z" },
    });
    expect(calls).toEqual([
      {
        kind: "rpc",
        target: SAVE_FUNCTION,
        payload: {
          p_campaign_id: CAMPAIGN,
          p_config: config,
          p_expected_updated_at: "2026-09-29T09:00:00.000Z",
        },
      },
    ]);
  });

  it("sends null as the expected version for a first save", async () => {
    const { repository, calls } = setup({
      rpc: () => ({
        data: { ok: true, config: { updatedAt: "2026-09-29T10:00:00.000Z" } },
      }),
    });
    await repository.save(wheelConfig());
    expect(
      (calls[0].payload as Record<string, unknown>).p_expected_updated_at,
    ).toBeNull();
  });

  it.each([
    ["CONFLICT", "CONFLICT"],
    ["TOO_LARGE", "STORAGE_FULL"],
    ["NOT_FOUND", "STORAGE_UNAVAILABLE"],
    ["INVALID", "STORAGE_UNAVAILABLE"],
  ])("maps the server's %s to %s", async (serverCode, repositoryCode) => {
    const { repository } = setup({
      rpc: () => ({ data: { ok: false, code: serverCode } }),
    });
    const result = await repository.save(wheelConfig());
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error.code).toBe(repositoryCode);
      expect(result.error.message.length).toBeGreaterThan(20);
    }
  });

  it("reports an unavailable server on an error, a network failure or an odd answer", async () => {
    const answers: FakeHandlers["rpc"][] = [
      () => ({ error: { message: "permission denied", code: "42501" } }),
      () => Promise.reject(new TypeError("Failed to fetch")),
      () => ({ data: "unexpected" }),
      () => ({ data: { ok: true, config: {} } }), // no updatedAt
    ];
    for (const rpc of answers) {
      const { repository } = setup({ rpc });
      const result = await repository.save(wheelConfig());
      expect(result.ok === false && result.error.code).toBe(
        "STORAGE_UNAVAILABLE",
      );
    }
  });

  it("never sends a standalone configuration to the server", async () => {
    const { repository, calls } = setup();
    const result = await repository.save(wheelConfig(null));
    expect(result.ok === false && result.error.code).toBe(
      "STORAGE_UNAVAILABLE",
    );
    expect(calls).toEqual([]);
  });
});

describe("createSupabaseExperienceRepository — remove", () => {
  it("deletes the campaign's row", async () => {
    const { repository, calls } = setup();
    await repository.remove({ campaignId: CAMPAIGN });
    expect(calls).toEqual([
      {
        kind: "delete",
        target: EXPERIENCE_TABLE,
        payload: [["campaign_id", CAMPAIGN]],
      },
    ]);
  });

  it("warns instead of throwing when the delete fails, and ignores standalone scopes", async () => {
    const { repository, calls, warnings } = setup({
      remove: () => ({ error: { message: "denied" } }),
    });
    await repository.remove({ campaignId: CAMPAIGN });
    await repository.remove({ campaignId: null });
    expect(calls).toHaveLength(1);
    expect(warnings[0]).toContain("could not be removed: denied");
  });
});
