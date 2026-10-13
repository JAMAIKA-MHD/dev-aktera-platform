// Expiry of a digital code (Reward Library). Pure helpers, no React, no Supabase.
//
// The database is the only judge of what can be given to a winner (is_code_assignable); these
// helpers only show the brand what it set. The brand picks a day: the code is valid until the
// end of that day in Algeria (UTC+1, no daylight saving), stored as a UTC timestamp.

const ALGIERS_OFFSET = "+01:00";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-12-31" → ISO instant of 23:59:59 that day in Algiers, or null if not a real date. */
export function algiersEndOfDayToIso(day: string): string | null {
  if (!DATE_ONLY.test(day)) return null;
  const instant = new Date(`${day}T23:59:59${ALGIERS_OFFSET}`);
  if (Number.isNaN(instant.getTime())) return null;
  // Rejects dates the parser rolls over (2026-02-31).
  return isoToAlgiersDay(instant.toISOString()) === day
    ? instant.toISOString()
    : null;
}

/** ISO instant → "YYYY-MM-DD" in Algiers ("" when empty or invalid). */
export function isoToAlgiersDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function isCodeExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  const instant = new Date(expiresAt);
  return !Number.isNaN(instant.getTime()) && instant.getTime() <= now.getTime();
}

/** A date already in the past is allowed (it expires the code now) but worth a warning. */
export function expiryWarning(
  iso: string | null,
  now: Date = new Date(),
): string | null {
  return iso && isCodeExpired(iso, now)
    ? "This date is in the past: the code(s) will be treated as expired right away."
    : null;
}

interface CountableCode {
  item_value: string | null;
  expires_at?: string | null;
  is_used?: boolean;
  is_redeemed?: boolean;
}

export interface CodeCounts {
  available: number;
  used: number;
  expired: number;
}

/** A code expires at its own date if it has one, otherwise at its reward's date. */
export function effectiveExpiry(
  own: string | null | undefined,
  inherited: string | null | undefined,
): string | null {
  return own || inherited || null;
}

/**
 * Codes with a value only: empty slots are not codes. Used wins over expired. `inherited` is
 * the date of the reward, for the codes that have none of their own.
 */
export function computeCodeCounts(
  items: CountableCode[],
  now: Date = new Date(),
  inherited: string | null = null,
): CodeCounts {
  const counts: CodeCounts = { available: 0, used: 0, expired: 0 };
  for (const item of items) {
    if (!item.item_value || item.item_value.trim() === "") continue;
    if (item.is_used || item.is_redeemed) counts.used += 1;
    else if (isCodeExpired(effectiveExpiry(item.expires_at, inherited), now))
      counts.expired += 1;
    else counts.available += 1;
  }
  return counts;
}

export type ImportedDay = { ok: true; iso: string | null } | { ok: false };

/**
 * An expiry date read from a file the brand imports: a day written 2026-12-31 or 31/12/2026, or
 * the number Excel stores for a date cell. Empty means no date. The day counts until its end in
 * Algeria, like a date picked on the screen.
 */
export function parseImportedDay(value: unknown): ImportedDay {
  if (value === null || value === undefined) return { ok: true, iso: null };

  let day: string | null = null;
  if (typeof value === "number") {
    // Excel counts the days since 1899-12-30.
    if (!Number.isFinite(value) || value < 1 || value > 100000) {
      return { ok: false };
    }
    day = new Date(Math.round((value - 25569) * 86400000))
      .toISOString()
      .slice(0, 10);
  } else {
    const text = String(value).trim();
    if (text === "") return { ok: true, iso: null };
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(text);
    const european = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (iso) day = `${iso[1]}-${iso[2]}-${iso[3]}`;
    else if (european) {
      day = `${european[3]}-${european[2].padStart(2, "0")}-${european[1].padStart(2, "0")}`;
    }
  }
  if (!day) return { ok: false };
  const end = algiersEndOfDayToIso(day);
  return end ? { ok: true, iso: end } : { ok: false };
}
