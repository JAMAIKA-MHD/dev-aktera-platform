import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "./__tests__/fakeSupabaseClient";
import {
  PUBLIC_EXPERIENCE_FUNCTION,
  loadPublicExperience,
} from "./loadPublicExperience";

describe("loadPublicExperience", () => {
  it("asks get_public_experience for the slug and validates the answer", async () => {
    const { client, calls } = createFakeSupabase({
      rpc: () => ({ data: { found: false } }),
    });
    expect(await loadPublicExperience(client, "zeta-wheel")).toEqual({
      status: "not_found",
    });
    expect(calls).toEqual([
      {
        kind: "rpc",
        target: PUBLIC_EXPERIENCE_FUNCTION,
        payload: { p_slug: "zeta-wheel" },
      },
    ]);
  });

  it("throws when the server cannot be reached", async () => {
    const { client } = createFakeSupabase({
      rpc: () => ({ error: { message: "Failed to fetch" } }),
    });
    await expect(loadPublicExperience(client, "x")).rejects.toThrow(
      "Could not load the campaign: Failed to fetch",
    );
  });

  it("throws on an unexpected answer", async () => {
    const { client } = createFakeSupabase({
      rpc: () => ({ data: { found: true } }),
    });
    await expect(loadPublicExperience(client, "x")).rejects.toThrow(
      "Unexpected public campaign answer",
    );
  });
});
