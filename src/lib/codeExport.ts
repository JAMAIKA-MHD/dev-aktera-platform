import type { PhysicalWinner, PrizeTemplate } from "../types";
import { effectiveExpiry, isCodeExpired, isoToAlgiersDay } from "./codeExpiry";
import { formatDuration } from "./expiryPolicy";

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
  /** The deadline fixed when the code was given (validity period after delivery). */
  redemption_expires_at?: string | null;
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
 * When a code expires, as the file shows it: its own date, else the deadline fixed when it was
 * given, else its reward's date, else the period it will be valid for once given.
 */
function expiresText(
  item: ExportableCode,
  inheritedExpiresAt: string | null,
  expiryDays: number | null,
): string {
  // An empty slot is not a code yet: nothing to expire.
  if (!item.item_value || item.item_value.trim() === "") return "";
  const day = isoToAlgiersDay(
    item.expires_at || item.redemption_expires_at || inheritedExpiresAt,
  );
  if (day) return day;
  const given = item.is_used || item.is_redeemed;
  return expiryDays && !given
    ? `${formatDuration(expiryDays)} after delivery`
    : "";
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
    /** The reward's validity period after delivery, in days. */
    expiryDays?: number | null;
    now?: Date;
  },
): Record<string, string | number>[] {
  const {
    category,
    inheritedExpiresAt = null,
    expiryDays = null,
    now = new Date(),
  } = options;
  return items.map((item) => {
    const row: Record<string, string | number> = {
      Index: item.item_index,
      Code: item.item_value ?? "",
      Status: codeExportStatus(item, inheritedExpiresAt, now),
    };
    if (category === "voucher") {
      row.Expires = expiresText(item, inheritedExpiresAt, expiryDays);
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

/** The columns of the codes file, in order: the export writes them, the import template shows them. */
export function codeFileColumns(category: PrizeTemplate["category"]): string[] {
  return category === "voucher"
    ? ["Index", "Code", "Status", "Expires", "Used on"]
    : ["Index", "Code", "Status", "Used on"];
}

/**
 * The template of the file to import: every column of the codes file, three example rows. Only
 * Code is needed; Index, and Expires (a day), may be left empty; Status and Used on are filled
 * by AKTERA when it writes a file, so they are empty here.
 */
export function importTemplateRows(
  category: PrizeTemplate["category"],
): Record<string, string | number>[] {
  return [1, 2, 3].map((index) => {
    const row: Record<string, string | number> = {};
    for (const column of codeFileColumns(category)) row[column] = "";
    row.Index = index;
    row.Code = `CODE-${String(index).padStart(4, "0")}`;
    return row;
  });
}
