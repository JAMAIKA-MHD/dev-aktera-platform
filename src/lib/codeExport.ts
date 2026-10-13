import type { PhysicalWinner, PrizeTemplate } from "../types";
import { effectiveExpiry, isCodeExpired, isoToAlgiersDay } from "./codeExpiry";

// The rows of the files a brand downloads from the Reward Library. Pure, so they are tested
// without a browser. Columns that the importer reads (Index, Code) keep their names, and no extra
// column contains "code", "value" or "index", so an exported file can be imported back.

interface ExportableCode {
  item_index: number;
  item_value: string | null;
  expires_at?: string | null;
  is_used?: boolean;
  is_redeemed?: boolean;
  redeemed_at?: string | null;
}

export type CodeExportStatus = "Empty" | "Used" | "Expired" | "Available";

export function codeExportStatus(
  item: ExportableCode,
  inheritedExpiresAt: string | null,
  now: Date,
): CodeExportStatus {
  if (!item.item_value || item.item_value.trim() === "") return "Empty";
  if (item.is_used || item.is_redeemed) return "Used";
  return isCodeExpired(
    effectiveExpiry(item.expires_at, inheritedExpiresAt),
    now,
  )
    ? "Expired"
    : "Available";
}

/**
 * One row per code slot: its number, the code, whether it is still available, used (given to a
 * winner) or expired, when it expires (digital rewards) and when it was given.
 */
export function buildCodeExportRows(
  items: ExportableCode[],
  options: {
    category: PrizeTemplate["category"];
    /** The reward's own expiry, for the codes without a date of their own. */
    inheritedExpiresAt?: string | null;
    now?: Date;
  },
): Record<string, string | number>[] {
  const { category, inheritedExpiresAt = null, now = new Date() } = options;
  return items.map((item) => {
    const row: Record<string, string | number> = {
      Index: item.item_index,
      Code: item.item_value ?? "",
      Status: codeExportStatus(item, inheritedExpiresAt, now),
    };
    if (category === "voucher") {
      row.Expires = isoToAlgiersDay(
        effectiveExpiry(item.expires_at, inheritedExpiresAt),
      );
    }
    row["Used on"] = isoToAlgiersDay(item.redeemed_at);
    return row;
  });
}

// A spreadsheet runs a cell that starts with one of these as a formula: names and phone numbers
// come from players, so they are defused.
const FORMULA_START = /^[=+\-@\t\r]/;
const safeCell = (value: string | null): string => {
  const text = value ?? "";
  return FORMULA_START.test(text) ? `'${text}` : text;
};

/** One row per winner of a physical reward, with whether the brand delivered it. */
export function buildDeliveryExportRows(
  winners: PhysicalWinner[],
): Record<string, string>[] {
  return winners.map((winner) => ({
    Winner: safeCell(winner.participantName),
    Phone: safeCell(winner.phoneNumber),
    Reward: safeCell(winner.prizeName),
    "Won on": isoToAlgiersDay(winner.wonAt),
    Delivery:
      winner.deliveryStatus === "delivered" ? "Delivered" : "Not delivered",
    "Delivered on": isoToAlgiersDay(winner.deliveredAt),
  }));
}
