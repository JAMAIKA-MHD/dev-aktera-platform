import { algiersEndOfDayToIso, isoToAlgiersDay } from "./codeExpiry";

// How the codes of a digital reward expire, as the brand sets it in the reward form:
//   - never,
//   - on a fixed date (the end of that day in Algeria),
//   - a period after delivery: the countdown starts when the code is given to the winner.
// Stored on the reward as `expires_at` or `expiry_days` (never both). Pure, no React.

export type ExpiryMode = "none" | "date" | "after_delivery";
export type DurationUnit = "days" | "weeks" | "months";

export interface ExpiryPolicyForm {
  mode: ExpiryMode;
  /** "YYYY-MM-DD", for the fixed date. */
  day: string;
  /** What was typed for the period, kept as text while it is edited. */
  amount: string;
  unit: DurationUnit;
}

export interface StoredExpiry {
  expiresAt: string | null;
  expiryDays: number | null;
}

export const MAX_EXPIRY_DAYS = 3650;
export const DEFAULT_EXPIRY_POLICY: ExpiryPolicyForm = {
  mode: "none",
  day: "",
  amount: "30",
  unit: "days",
};

// A month is counted as 30 days: simple, and the same for everyone.
const DAYS_PER_UNIT: Record<DurationUnit, number> = {
  days: 1,
  weeks: 7,
  months: 30,
};

export function daysFromAmount(
  amount: string,
  unit: DurationUnit,
): number | null {
  const text = amount.trim();
  if (!/^\d+$/.test(text)) return null;
  const days = Number(text) * DAYS_PER_UNIT[unit];
  return days >= 1 && days <= MAX_EXPIRY_DAYS ? days : null;
}

/** 30 → 1 month, 14 → 2 weeks, 45 → 45 days: the largest unit that divides evenly. */
export function splitDays(days: number): {
  amount: number;
  unit: DurationUnit;
} {
  if (days % DAYS_PER_UNIT.months === 0) {
    return { amount: days / DAYS_PER_UNIT.months, unit: "months" };
  }
  if (days % DAYS_PER_UNIT.weeks === 0) {
    return { amount: days / DAYS_PER_UNIT.weeks, unit: "weeks" };
  }
  return { amount: days, unit: "days" };
}

const UNIT_LABEL: Record<DurationUnit, [string, string]> = {
  days: ["day", "days"],
  weeks: ["week", "weeks"],
  months: ["month", "months"],
};

export function formatDuration(days: number): string {
  const { amount, unit } = splitDays(days);
  return `${amount} ${UNIT_LABEL[unit][amount === 1 ? 0 : 1]}`;
}

/** The form for a reward that already exists (to edit it). */
export function policyFromReward(reward: {
  expiresAt?: string | null;
  expiryDays?: number | null;
}): ExpiryPolicyForm {
  if (reward.expiryDays) {
    const { amount, unit } = splitDays(reward.expiryDays);
    return { mode: "after_delivery", day: "", amount: String(amount), unit };
  }
  if (reward.expiresAt) {
    return {
      ...DEFAULT_EXPIRY_POLICY,
      mode: "date",
      day: isoToAlgiersDay(reward.expiresAt),
    };
  }
  return { ...DEFAULT_EXPIRY_POLICY };
}

export type PolicyResult =
  | { ok: true; expiresAt: string | null; expiryDays: number | null }
  | { ok: false; error: string };

/** What to store for the form, or what is wrong with it. */
export function policyToStored(form: ExpiryPolicyForm): PolicyResult {
  if (form.mode === "date") {
    if (!form.day) return { ok: false, error: "Pick the expiry date." };
    const iso = algiersEndOfDayToIso(form.day);
    if (!iso) return { ok: false, error: "Enter a valid expiry date." };
    return { ok: true, expiresAt: iso, expiryDays: null };
  }
  if (form.mode === "after_delivery") {
    const days = daysFromAmount(form.amount, form.unit);
    if (days === null) {
      return {
        ok: false,
        error: `Enter a whole number of ${form.unit} (up to ${MAX_EXPIRY_DAYS} days).`,
      };
    }
    return { ok: true, expiresAt: null, expiryDays: days };
  }
  return { ok: true, expiresAt: null, expiryDays: null };
}

/** The same setting in words, for the card, the modal and the files. */
export function describeExpiry(reward: {
  expiresAt?: string | null;
  expiryDays?: number | null;
}): string {
  if (reward.expiryDays) {
    return `${formatDuration(reward.expiryDays)} after delivery`;
  }
  if (reward.expiresAt) return `until ${isoToAlgiersDay(reward.expiresAt)}`;
  return "no expiry";
}
