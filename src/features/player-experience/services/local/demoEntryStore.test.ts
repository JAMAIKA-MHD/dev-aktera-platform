import { afterEach, describe, expect, it } from "vitest";
import type { DrawOutcome } from "../../domain/participation";
import {
  DEMO_ENTRIES_KEY,
  createDemoEntryStore,
  withDemoStock,
  type DemoEntry,
} from "./demoEntryStore";
import type { DemoCampaignRules } from "./demoRules";

const WIN = (prizeId: string): DrawOutcome => ({
  isWinner: true,
  prize: { id: prizeId, name: prizeId, winMessage: null },
  couponCode: "DEMO-ABCD-EFGH",
});
const LOSS: DrawOutcome = { isWinner: false, prize: null, couponCode: null };

let sequence = 0;
const entry = (changes: Partial<DemoEntry> = {}): DemoEntry => {
  sequence += 1;
  return {
    entryId: `entry-${sequence}`,
    campaignId: "campaign-1",
    phone: "0541234567",
    clientRequestId: `request-${sequence}`,
    outcome: LOSS,
    couponConfirmed: false,
    createdAt: "2026-09-21T19:00:00.000Z",
    ...changes,
  };
};

// Map-based Storage that can refuse reads or writes.
function fakeStorage() {
  const items = new Map<string, string>();
  const state = { failReads: false, failWrites: false };
  const storage = {
    getItem: (key: string) => {
      if (state.failReads) throw new DOMException("Blocked", "SecurityError");
      return items.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (state.failWrites) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      items.set(key, value);
    },
    removeItem: (key: string) => void items.delete(key),
  } as unknown as Storage;
  return { storage, items, state };
}

afterEach(() => localStorage.clear());

describe("demoEntryStore", () => {
  it("detects a duplicate participation by normalized phone number", () => {
    const store = createDemoEntryStore();
    store.record(entry({ phone: "+213 541 23 45 67" }));
    expect(store.countByPhone("campaign-1", "0541234567")).toBe(1);
    expect(store.countByPhone("campaign-1", "05 41 23 45 67")).toBe(1);
    expect(store.countByPhone("campaign-1", "0661234567")).toBe(0);
    expect(store.countByPhone("campaign-2", "0541234567")).toBe(0);
    expect(store.list("campaign-1")[0].phone).toBe("0541234567");
  });

  it("persists in localStorage, so another tab or a reload sees the entries", () => {
    createDemoEntryStore().record(entry());
    expect(
      JSON.parse(localStorage.getItem(DEMO_ENTRIES_KEY) ?? "[]"),
    ).toHaveLength(1);
    expect(createDemoEntryStore().list("campaign-1")).toHaveLength(1);
  });

  it("finds an entry by request (for retries) and by id", () => {
    const store = createDemoEntryStore();
    const recorded = entry();
    store.record(recorded);
    expect(store.findByRequest(recorded.clientRequestId)).toEqual(recorded);
    expect(store.findById(recorded.entryId)).toEqual(recorded);
    expect(store.findByRequest("unknown")).toBeNull();
    expect(store.findById("unknown")).toBeNull();
  });

  it("counts the demo wins of each prize", () => {
    const store = createDemoEntryStore();
    store.record(entry({ outcome: WIN("voucher") }));
    store.record(entry({ outcome: WIN("voucher"), phone: "0661234567" }));
    store.record(entry({ outcome: WIN("gift"), phone: "0771234567" }));
    store.record(entry({ outcome: LOSS, phone: "0551234567" }));
    store.record(entry({ outcome: WIN("voucher"), campaignId: "campaign-2" }));
    expect(store.wonByPrize("campaign-1")).toEqual({ voucher: 2, gift: 1 });
  });

  it("confirms a coupon once the player copied it", () => {
    const store = createDemoEntryStore();
    const recorded = entry({ outcome: WIN("voucher") });
    store.record(recorded);
    expect(store.confirmCoupon(recorded.entryId)).toBe(true);
    expect(store.findById(recorded.entryId)?.couponConfirmed).toBe(true);
    expect(store.confirmCoupon("unknown")).toBe(false);
  });

  it("resets one campaign, or all the demo data", () => {
    const store = createDemoEntryStore();
    store.record(entry());
    store.record(entry({ campaignId: "campaign-2" }));
    store.reset("campaign-1");
    expect(store.list("campaign-1")).toEqual([]);
    expect(store.list("campaign-2")).toHaveLength(1);
    store.reset();
    expect(store.list("campaign-2")).toEqual([]);
    expect(localStorage.getItem(DEMO_ENTRIES_KEY)).toBeNull();
  });

  it("drops damaged demo data instead of failing", () => {
    localStorage.setItem(DEMO_ENTRIES_KEY, "{not json");
    expect(createDemoEntryStore().list("campaign-1")).toEqual([]);
    localStorage.setItem(
      DEMO_ENTRIES_KEY,
      JSON.stringify([entry(), { entryId: 1 }, null, "x"]),
    );
    expect(createDemoEntryStore().list("campaign-1")).toHaveLength(1);
    localStorage.setItem(DEMO_ENTRIES_KEY, JSON.stringify({ entries: [] }));
    expect(createDemoEntryStore().list("campaign-1")).toEqual([]);
  });

  it("keeps working in memory when the storage is blocked", () => {
    const { storage, state } = fakeStorage();
    state.failReads = true;
    const store = createDemoEntryStore({ getStorage: () => storage });
    store.record(entry());
    expect(store.countByPhone("campaign-1", "0541234567")).toBe(1);
  });

  it("keeps working in memory when the storage is full, without losing entries", () => {
    const { storage, state, items } = fakeStorage();
    const store = createDemoEntryStore({ getStorage: () => storage });
    store.record(entry());
    state.failWrites = true;
    store.record(entry({ phone: "0661234567" }));
    // The second entry only lives in memory, and is still counted.
    expect(store.list("campaign-1")).toHaveLength(2);
    expect(JSON.parse(items.get(DEMO_ENTRIES_KEY) ?? "[]")).toHaveLength(1);
  });
});

describe("withDemoStock", () => {
  it("takes the demo wins out of the stock, never below zero", () => {
    const store = createDemoEntryStore();
    store.record(entry({ outcome: WIN("voucher") }));
    store.record(entry({ outcome: WIN("gift"), phone: "0661234567" }));
    store.record(entry({ outcome: WIN("gift"), phone: "0771234567" }));
    const rules: DemoCampaignRules = {
      campaignId: "campaign-1",
      active: true,
      winProbability: 50,
      maxEntries: 1,
      prizes: [
        {
          id: "voucher",
          name: "Bon",
          winMessage: null,
          weight: 1,
          remaining: 5,
        },
        {
          id: "gift",
          name: "Coffret",
          winMessage: null,
          weight: 1,
          remaining: 1,
        },
        {
          id: "phone",
          name: "Mobile",
          winMessage: null,
          weight: 1,
          remaining: 2,
        },
      ],
    };
    expect(
      withDemoStock(rules, store).prizes.map((prize) => prize.remaining),
    ).toEqual([4, 0, 2]);
    expect(rules.prizes[0].remaining).toBe(5); // the real stock is untouched
  });
});
