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

// ---- What the files say about themselves (shown before the download) -------------------------

export interface ExportColumn {
  name: string;
  meaning: string;
  example: string;
}

/** The columns of the codes file, in order, as buildCodeExportRows writes them. */
export function codeExportColumns(
  category: PrizeTemplate["category"],
): ExportColumn[] {
  const columns: ExportColumn[] = [
    {
      name: "Index",
      meaning: "The number of the code slot in the reward.",
      example: "1",
    },
    {
      name: "Code",
      meaning:
        "The code itself, as it is given to the winner. Empty for a slot that has no code yet.",
      example: "OOR-500-0001",
    },
    {
      name: "Status",
      meaning:
        "Available (can still be given), Used (given to a winner), Expired (its date has passed, it is never given) or Empty (a slot without a code).",
      example: "Available",
    },
  ];
  if (category === "voucher") {
    columns.push({
      name: "Expires",
      meaning:
        "When the code stops being valid: its own date, the deadline fixed when it was given, or the date of the reward. Empty when it never expires. With a period after delivery, a code not given yet shows the period.",
      example: "2026-12-31",
    });
  }
  columns.push({
    name: "Used on",
    meaning: "The day the code was given to a winner. Empty until then.",
    example: "2026-10-10",
  });
  return columns;
}

/** The columns of the winners file, in order, as buildDeliveryExportRows writes them. */
export const DELIVERY_EXPORT_COLUMNS: ExportColumn[] = [
  {
    name: "Winner",
    meaning: "The name the player gave. Empty when none was given.",
    example: "Sara B.",
  },
  {
    name: "Phone",
    meaning: "The phone number the player played with.",
    example: "0551234567",
  },
  {
    name: "Reward",
    meaning: "The reward that was won.",
    example: "Branded cap",
  },
  { name: "Won on", meaning: "The day of the win.", example: "2026-10-12" },
  {
    name: "Delivery",
    meaning: "Delivered, or Not delivered: whether you handed the reward over.",
    example: "Not delivered",
  },
  {
    name: "Delivered on",
    meaning: "The day you recorded the delivery. Empty until then.",
    example: "2026-10-14",
  },
];

export type CodeExportScope =
  "all" | "filled" | "available" | "used" | "expired";

/** Which code rows to write: every slot, only the slots with a code, or one status. */
export function filterCodeRows<T extends { Status?: unknown }>(
  rows: T[],
  scope: CodeExportScope,
): T[] {
  switch (scope) {
    case "filled":
      return rows.filter((row) => row.Status !== "Empty");
    case "available":
      return rows.filter((row) => row.Status === "Available");
    case "used":
      return rows.filter((row) => row.Status === "Used");
    case "expired":
      return rows.filter((row) => row.Status === "Expired");
    default:
      return rows;
  }
}

export type DeliveryExportScope = "all" | "not_delivered" | "delivered";

export function filterDeliveryRows<T extends { Delivery?: unknown }>(
  rows: T[],
  scope: DeliveryExportScope,
): T[] {
  switch (scope) {
    case "not_delivered":
      return rows.filter((row) => row.Delivery === "Not delivered");
    case "delivered":
      return rows.filter((row) => row.Delivery === "Delivered");
    default:
      return rows;
  }
}
