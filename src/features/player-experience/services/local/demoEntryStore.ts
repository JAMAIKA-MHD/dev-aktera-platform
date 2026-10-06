import type { DrawOutcome } from "../../domain/participation";
import { normalizeDzPhone } from "../../domain/phone";
import type { DemoCampaignRules } from "./demoRules";

// Demo participations, kept in localStorage so that the anti-duplicate rule and the stock
// behave as on the server, across reloads and tabs. The Studio's "Reset demo data" button
// calls reset(). If storage is blocked or full, the store keeps working in memory.

export const DEMO_ENTRIES_KEY = "xp:demo:entries:v1";

export interface DemoEntry {
  entryId: string;
  campaignId: string;
  phone: string; // normalized with normalizeDzPhone: the anti-duplicate key, as on the server
  clientRequestId: string; // a retried request returns this entry instead of drawing again
  outcome: DrawOutcome;
  couponConfirmed: boolean;
  createdAt: string; // ISO 8601
}

export interface DemoEntryStore {
  list(campaignId: string): DemoEntry[];
  countByPhone(campaignId: string, phone: string): number;
  findByRequest(clientRequestId: string): DemoEntry | null;
  findById(entryId: string): DemoEntry | null;
  wonByPrize(campaignId: string): Record<string, number>;
  record(entry: DemoEntry): void;
  confirmCoupon(entryId: string): boolean; // false if the entry does not exist
  reset(campaignId?: string): void; // one campaign, or all demo data
}

export interface DemoEntryStoreOptions {
  getStorage?: () => Storage; // a getter: reading window.localStorage throws when it is blocked
}

function isDemoEntry(value: unknown): value is DemoEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.entryId === "string" &&
    typeof entry.campaignId === "string" &&
    typeof entry.phone === "string" &&
    typeof entry.clientRequestId === "string" &&
    typeof entry.outcome === "object" &&
    entry.outcome !== null &&
    typeof entry.couponConfirmed === "boolean" &&
    typeof entry.createdAt === "string"
  );
}

export function createDemoEntryStore(
  options: DemoEntryStoreOptions = {},
): DemoEntryStore {
  const getStorage = options.getStorage ?? (() => globalThis.localStorage);
  let memory: DemoEntry[] = [];
  // Once a write has failed, localStorage lags behind: memory becomes the only truth.
  let memoryOnly = false;

  function readAll(): DemoEntry[] {
    if (memoryOnly) return memory;
    try {
      const raw = getStorage().getItem(DEMO_ENTRIES_KEY);
      const data: unknown = raw === null ? [] : JSON.parse(raw);
      // Damaged demo data is dropped: it is only test data.
      memory = Array.isArray(data) ? data.filter(isDemoEntry) : [];
    } catch {
      memoryOnly = true;
    }
    return memory;
  }

  function writeAll(entries: DemoEntry[]) {
    memory = entries;
    if (memoryOnly) return;
    try {
      const storage = getStorage();
      if (entries.length === 0) storage.removeItem(DEMO_ENTRIES_KEY);
      else storage.setItem(DEMO_ENTRIES_KEY, JSON.stringify(entries));
    } catch {
      memoryOnly = true;
    }
  }

  return {
    list: (campaignId) =>
      readAll().filter((entry) => entry.campaignId === campaignId),

    countByPhone(campaignId, phone) {
      const normalized = normalizeDzPhone(phone);
      return readAll().filter(
        (entry) =>
          entry.campaignId === campaignId && entry.phone === normalized,
      ).length;
    },

    findByRequest: (clientRequestId) =>
      readAll().find((entry) => entry.clientRequestId === clientRequestId) ??
      null,

    findById: (entryId) =>
      readAll().find((entry) => entry.entryId === entryId) ?? null,

    wonByPrize(campaignId) {
      const won: Record<string, number> = {};
      for (const entry of readAll()) {
        const prizeId = entry.outcome.prize?.id;
        if (
          entry.campaignId === campaignId &&
          entry.outcome.isWinner &&
          prizeId
        ) {
          won[prizeId] = (won[prizeId] ?? 0) + 1;
        }
      }
      return won;
    },

    record(entry) {
      writeAll([
        ...readAll(),
        { ...entry, phone: normalizeDzPhone(entry.phone) },
      ]);
    },

    confirmCoupon(entryId) {
      const entries = readAll();
      if (!entries.some((entry) => entry.entryId === entryId)) return false;
      writeAll(
        entries.map((entry) =>
          entry.entryId === entryId
            ? { ...entry, couponConfirmed: true }
            : entry,
        ),
      );
      return true;
    },

    reset(campaignId) {
      writeAll(
        campaignId === undefined
          ? []
          : readAll().filter((entry) => entry.campaignId !== campaignId),
      );
    },
  };
}

// The rules with the demo wins taken out of the stock: prizes won in the demo run out as
// they would on the server. The real campaign stock is never touched.
export function withDemoStock(
  rules: DemoCampaignRules,
  store: DemoEntryStore,
): DemoCampaignRules {
  const won = store.wonByPrize(rules.campaignId);
  return {
    ...rules,
    prizes: rules.prizes.map((prize) => ({
      ...prize,
      remaining: Math.max(0, prize.remaining - (won[prize.id] ?? 0)),
    })),
  };
}
