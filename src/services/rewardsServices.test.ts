import { beforeEach, describe, expect, it, vi } from "vitest";

// A chainable stand-in for a Supabase query: every method records its call and returns the same
// chain; awaiting it gives the configured result.
type Call = { method: string; args: unknown[] };
const mock = vi.hoisted(() => ({
  calls: [] as { table: string; calls: Call[] }[],
  results: {} as Record<string, { data: unknown; error: unknown }>,
  rpc: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      const entry = { table, calls: [] as Call[] };
      mock.calls.push(entry);
      const chain: unknown = new Proxy(
        {},
        {
          get: (_target, method: string) => {
            if (method === "then") {
              const result = mock.results[table] ?? { data: [], error: null };
              return (resolve: (value: unknown) => void) => resolve(result);
            }
            return (...args: unknown[]) => {
              entry.calls.push({ method, args });
              return chain;
            };
          },
        },
      );
      return chain;
    },
    rpc: mock.rpc,
  },
}));

import {
  fetchTemplateItemsService,
  setExpiryForTemplateItemsService,
  updateItemExpiryService,
} from "./inventoryService";
import { fetchPhysicalWinners, setDeliveryStatus } from "./deliveryService";

const callsOf = (table: string) =>
  mock.calls.filter((c) => c.table === table).flatMap((c) => c.calls);
const has = (table: string, method: string, ...args: unknown[]) =>
  callsOf(table).some(
    (c) =>
      c.method === method && JSON.stringify(c.args) === JSON.stringify(args),
  );

beforeEach(() => {
  mock.calls.length = 0;
  mock.results = {};
  mock.rpc.mockReset();
});

describe("code expiry services", () => {
  it("reads expires_at with the codes", async () => {
    mock.results.prize_template_items = {
      data: [
        {
          id: "i1",
          prize_template_id: "t1",
          item_index: 1,
          item_value: "A",
          source_type: "manual",
          expires_at: "2026-12-31T22:59:59.000Z",
        },
      ],
      error: null,
    };
    const rows = await fetchTemplateItemsService("t1");
    const select = callsOf("prize_template_items").find(
      (c) => c.method === "select",
    );
    expect(String(select?.args[0])).toContain("expires_at");
    expect(rows[0].expires_at).toBe("2026-12-31T22:59:59.000Z");
  });

  it("sets and clears the expiry of one code", async () => {
    await updateItemExpiryService("i1", "2026-12-31T22:59:59.000Z");
    expect(
      has("prize_template_items", "update", {
        expires_at: "2026-12-31T22:59:59.000Z",
      }),
    ).toBe(true);
    expect(has("prize_template_items", "eq", "id", "i1")).toBe(true);

    await updateItemExpiryService("i1", null);
    expect(has("prize_template_items", "update", { expires_at: null })).toBe(
      true,
    );
  });

  it("an error from the database is thrown", async () => {
    mock.results.prize_template_items = {
      data: null,
      error: new Error("boom"),
    };
    await expect(updateItemExpiryService("i1", null)).rejects.toThrow("boom");
  });

  it("applies one date to the codes with a value, keeping dates already set by default", async () => {
    mock.results.prize_template_items = {
      data: [{ id: "a" }, { id: "b" }],
      error: null,
    };
    const count = await setExpiryForTemplateItemsService(
      "t1",
      "2026-12-31T22:59:59.000Z",
    );
    expect(count).toBe(2);
    expect(has("prize_template_items", "eq", "prize_template_id", "t1")).toBe(
      true,
    );
    expect(has("prize_template_items", "not", "item_value", "is", null)).toBe(
      true,
    );
    expect(has("prize_template_items", "is", "expires_at", null)).toBe(true);
  });

  it("overwrites dates already set only when asked", async () => {
    await setExpiryForTemplateItemsService("t1", "2026-12-31T22:59:59.000Z", {
      onlyWithoutDate: false,
    });
    expect(has("prize_template_items", "is", "expires_at", null)).toBe(false);
  });
});

describe("delivery service", () => {
  it("lists the winners of physical rewards, mapped", async () => {
    mock.results.entries = {
      data: [
        {
          id: "e1",
          phone_number: "0551111111",
          participant_name: "Ali",
          created_at: "2026-10-12T10:00:00Z",
          delivery_status: "delivered",
          delivered_at: "2026-10-13T09:00:00Z",
          prizes: { name: "Phone case", prize_template_id: "t1" },
        },
        {
          id: "e2",
          phone_number: null,
          participant_name: null,
          created_at: "2026-10-12T11:00:00Z",
          delivery_status: null,
          delivered_at: null,
          prizes: [{ name: "Mug", prize_template_id: "t2" }],
        },
      ],
      error: null,
    };
    const winners = await fetchPhysicalWinners("org1");
    expect(winners).toEqual([
      {
        entryId: "e1",
        phoneNumber: "0551111111",
        participantName: "Ali",
        prizeName: "Phone case",
        wonAt: "2026-10-12T10:00:00Z",
        deliveryStatus: "delivered",
        deliveredAt: "2026-10-13T09:00:00Z",
      },
      {
        entryId: "e2",
        phoneNumber: null,
        participantName: null,
        prizeName: "Mug",
        wonAt: "2026-10-12T11:00:00Z",
        deliveryStatus: "not_delivered",
        deliveredAt: null,
      },
    ]);
    expect(has("entries", "eq", "organization_id", "org1")).toBe(true);
    expect(has("entries", "eq", "is_winner", true)).toBe(true);
    expect(
      has("entries", "eq", "prizes.prize_templates.category", "physical"),
    ).toBe(true);
    expect(
      callsOf("entries").some((c) => c.args[0] === "prizes.prize_template_id"),
    ).toBe(false);
  });

  it("can be limited to one reward", async () => {
    await fetchPhysicalWinners("org1", "t1");
    expect(has("entries", "eq", "prizes.prize_template_id", "t1")).toBe(true);
  });

  it("calls the RPC to change a status", async () => {
    mock.rpc.mockResolvedValue({ error: null });
    await setDeliveryStatus("e1", "delivered");
    expect(mock.rpc).toHaveBeenCalledWith("set_entry_delivery_status", {
      p_entry_id: "e1",
      p_status: "delivered",
    });
  });

  it("turns a refusal into a readable message", async () => {
    mock.rpc.mockResolvedValue({
      error: { message: "You are not allowed to update this delivery status." },
    });
    await expect(setDeliveryStatus("e1", "delivered")).rejects.toThrow(
      "You are not allowed to update this delivery status.",
    );
  });

  it("never shows a technical error as is", async () => {
    mock.rpc.mockResolvedValue({
      error: { message: 'duplicate key value violates unique constraint "x"' },
    });
    await expect(setDeliveryStatus("e1", "delivered")).rejects.toThrow(
      /could not update the delivery status/i,
    );
  });
});
