import { describe, expect, it } from "vitest";
import { createDefaultExperience } from "../domain/defaults";
import { createLocalServices } from "./createLocalServices";
import {
  createPublicServices,
  createStudioServices,
} from "./createSupabaseServices";
import { buildStandaloneDemoRules } from "./local/demoRules";
import { createDemoCampaign } from "../presets/demoCampaign";
import { createFakeSupabase } from "./supabase/__tests__/fakeSupabaseClient";

const SUPABASE_URL = "http://127.0.0.1:54321";
const storageRef = {
  kind: "storage" as const,
  bucket: "campaign-media",
  path: "org/experience/c/logo.webp",
};
const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/campaign-media/org/experience/c/logo.webp`;

describe("createStudioServices", () => {
  it("saves to Supabase but keeps the draws simulated", () => {
    const { client } = createFakeSupabase();
    const services = createStudioServices({
      client,
      supabaseUrl: SUPABASE_URL,
      organizationId: "org",
      campaignId: "c",
      rules: buildStandaloneDemoRules(createDemoCampaign("lucky_wheel")),
    });
    expect(services.participation.mode).toBe("demo");
    expect(services.assets.resolveUrl(storageRef)).toBe(publicUrl);
  });

  it("uses the repository it is given", () => {
    const { client } = createFakeSupabase();
    const repository = createLocalServices().repository;
    const services = createStudioServices({
      client,
      supabaseUrl: SUPABASE_URL,
      organizationId: "org",
      campaignId: "c",
      rules: buildStandaloneDemoRules(createDemoCampaign("lucky_wheel")),
      repository,
    });
    expect(services.repository).toBe(repository);
  });
});

describe("createPublicServices", () => {
  it("draws with the live gateway only, and resolves Storage images", async () => {
    const { client } = createFakeSupabase();
    const services = createPublicServices({
      client,
      supabaseUrl: SUPABASE_URL,
      availability: { open: true },
    });
    expect(services.participation.mode).toBe("live");
    expect(await services.participation.checkAvailability("c")).toEqual({
      open: true,
    });
    expect(services.assets.resolveUrl(storageRef)).toBe(publicUrl);
  });

  it("never saves a design", async () => {
    const { client, calls } = createFakeSupabase();
    const services = createPublicServices({
      client,
      supabaseUrl: SUPABASE_URL,
      availability: { open: true },
    });
    expect(await services.repository.load({ campaignId: "c" })).toBeNull();
    const saved = await services.repository.save(
      createDefaultExperience({ gameType: "lucky_wheel" }),
    );
    expect(saved.ok).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe("createLocalServices — resolveStorage", () => {
  it("resolves Storage images only when given the resolver", () => {
    expect(createLocalServices().assets.resolveUrl(storageRef)).toBeNull();
    expect(
      createLocalServices({
        resolveStorage: () => "https://example/logo.webp",
      }).assets.resolveUrl(storageRef),
    ).toBe("https://example/logo.webp");
  });
});
