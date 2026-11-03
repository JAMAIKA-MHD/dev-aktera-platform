import { describe, expect, it } from "vitest";
import type { GamePayload } from "../domain/participation";
import { passesSkillGate } from "./local/demoDrawEngine";
import type { DemoCampaignRules } from "./local/demoRules";
import { toSelectPrizeBody } from "./supabase/selectPrizeMapping";

// Memory Match, Catch It and Spot the Difference on the two ports: the demo gateway judges
// them like the server does, and the live gateway sends the keys resolve_game_outcome reads.

const rules = (changes: Partial<DemoCampaignRules>): DemoCampaignRules => ({
  campaignId: "campaign-1",
  active: true,
  winProbability: 100,
  maxEntries: 1,
  prizes: [],
  ...changes,
});

describe("demo skill gate", () => {
  it("passes Catch It at the goal and not below it", () => {
    const r = rules({ catchIt: { winThreshold: 10 } });
    const caught = (n: number): GamePayload => ({
      kind: "catch",
      caught: n,
      elapsedMs: 9000,
    });
    expect(passesSkillGate(r, caught(10))).toBe(true);
    expect(passesSkillGate(r, caught(9))).toBe(false);
    expect(passesSkillGate(r, { kind: "none" })).toBe(false);
  });

  it("passes Memory Match only when every pair of the board is found", () => {
    const r = rules({ memory: { pairs: 6 } });
    const memory = (pairs: number): GamePayload => ({
      kind: "memory",
      pairs,
      moves: 10,
      elapsedMs: 20000,
    });
    expect(passesSkillGate(r, memory(6))).toBe(true);
    expect(passesSkillGate(r, memory(5))).toBe(false);
  });

  it("passes Spot the Difference only when every difference is found", () => {
    const r = rules({ spot: { differences: 5 } });
    const spot = (found: number): GamePayload => ({
      kind: "spot",
      found,
      elapsedMs: 15000,
    });
    expect(passesSkillGate(r, spot(5))).toBe(true);
    expect(passesSkillGate(r, spot(4))).toBe(false);
    expect(passesSkillGate(r, { kind: "hitIt", hits: 99 })).toBe(false);
  });
});

describe("select-prize body", () => {
  const body = (gamePayload: GamePayload) =>
    toSelectPrizeBody({
      clientRequestId: "req-1",
      campaignId: "campaign-1",
      participant: { phone: "0550123456" },
      consent: {
        accepted: true,
        acceptedAt: "2026-11-03T10:00:00.000Z",
        policyVersion: "2026-09-01",
        locale: "fr",
      },
      gamePayload,
      humanToken: null,
      context: {
        sessionId: "s",
        dwellTimeSeconds: 30,
        userAgent: "ua",
        source: "web_player",
      },
    }).game_payload;

  it("sends the keys the SQL function reads", () => {
    expect(
      body({ kind: "memory", pairs: 6, moves: 9, elapsedMs: 21000 }),
    ).toEqual({ pairs_matched: 6, moves: 9, elapsed_ms: 21000 });
    expect(body({ kind: "catch", caught: 10, elapsedMs: 8000 })).toEqual({
      caught: 10,
      elapsed_ms: 8000,
    });
    expect(body({ kind: "spot", found: 5, elapsedMs: 15000 })).toEqual({
      found: 5,
      elapsed_ms: 15000,
    });
  });
});
