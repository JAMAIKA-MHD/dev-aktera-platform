import { beforeEach, describe, expect, it, vi } from "vitest";

// A chainable stand-in for a Supabase query that records what is sent.
type Call = { method: string; args: unknown[] };
const mock = vi.hoisted(() => ({
  calls: [] as Call[],
  result: { data: { id: "t1" }, error: null } as {
    data: unknown;
    error: unknown;
  },
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => {
      const chain: unknown = new Proxy(
        {},
        {
          get: (_target, method: string) => {
            if (method === "then") {
              return (resolve: (value: unknown) => void) =>
                resolve(mock.result);
            }
            return (...args: unknown[]) => {
              mock.calls.push({ method, args });
              return chain;
            };
          },
        },
      );
      return chain;
    },
  },
}));

import {
  addPrizeTemplateService,
  updatePrizeTemplateService,
} from "./campaignService";

const sent = (method: string) =>
  mock.calls.find((c) => c.method === method)?.args[0] as Record<
    string,
    unknown
  >;

const voucher = {
  name: "500 DA",
  category: "voucher" as const,
  itemValue: "500 DA",
  totalStock: 10,
  expiresAt: "2026-12-31T22:59:59.000Z",
};

beforeEach(() => {
  mock.calls.length = 0;
  mock.result = { data: { id: "t1" }, error: null };
});

describe("the expiry date of a reward template", () => {
  it("is saved with a new digital reward", async () => {
    await addPrizeTemplateService(voucher, "org1");
    expect(sent("insert").expires_at).toBe("2026-12-31T22:59:59.000Z");
  });

  it("is empty when the brand picked none", async () => {
    await addPrizeTemplateService({ ...voucher, expiresAt: null }, "org1");
    expect(sent("insert").expires_at).toBeNull();
    mock.calls.length = 0;
    await addPrizeTemplateService({ ...voucher, expiresAt: undefined }, "org1");
    expect(sent("insert").expires_at).toBeNull();
  });

  it("is never saved on a physical reward", async () => {
    await addPrizeTemplateService({ ...voucher, category: "physical" }, "org1");
    expect(sent("insert").expires_at).toBeNull();
  });

  it("is changed, or cleared, when the reward is edited", async () => {
    await updatePrizeTemplateService("t1", voucher);
    expect(sent("update").expires_at).toBe("2026-12-31T22:59:59.000Z");

    mock.calls.length = 0;
    await updatePrizeTemplateService("t1", { ...voucher, expiresAt: null });
    expect(sent("update").expires_at).toBeNull();
  });

  it("is cleared when a reward becomes physical", async () => {
    await updatePrizeTemplateService("t1", {
      ...voucher,
      category: "physical",
    });
    expect(sent("update")).toMatchObject({
      category: "physical",
      expires_at: null,
    });
  });

  it("saves a validity period after delivery instead of a date", async () => {
    await addPrizeTemplateService(
      { ...voucher, expiresAt: null, expiryDays: 30 },
      "org1",
    );
    expect(sent("insert")).toMatchObject({ expires_at: null, expiry_days: 30 });

    mock.calls.length = 0;
    await updatePrizeTemplateService("t1", {
      ...voucher,
      expiresAt: null,
      expiryDays: 14,
    });
    expect(sent("update")).toMatchObject({ expires_at: null, expiry_days: 14 });
  });

  it("never saves a period on a physical reward", async () => {
    await addPrizeTemplateService(
      { ...voucher, category: "physical", expiresAt: null, expiryDays: 30 },
      "org1",
    );
    expect(sent("insert").expiry_days).toBeNull();

    mock.calls.length = 0;
    await updatePrizeTemplateService("t1", {
      ...voucher,
      category: "physical",
      expiresAt: null,
      expiryDays: 30,
    });
    expect(sent("update").expiry_days).toBeNull();
  });

  it("clears the period when the reward goes back to no expiry", async () => {
    await updatePrizeTemplateService("t1", {
      ...voucher,
      expiresAt: null,
      expiryDays: null,
    });
    expect(sent("update")).toMatchObject({
      expires_at: null,
      expiry_days: null,
    });
  });
});
