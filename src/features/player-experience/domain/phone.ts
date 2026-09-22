// Algerian mobile numbers: 10 digits, starting with 05, 06 or 07.
// Same check as select-prize: /^(05|06|07)[0-9]{8}$/.
const DZ_MOBILE_PATTERN = /^0[567]\d{8}$/;

// Exact copy of normalizeDzPhone in supabase/functions/select-prize/index.ts:25 — keep both in sync.
export const normalizeDzPhone = (rawPhone: string): string => {
  const digitsOnly = rawPhone.replace(/\D/g, "");
  if (digitsOnly.startsWith("213") && digitsOnly.length === 12) {
    return `0${digitsOnly.slice(3)}`;
  }
  if (digitsOnly.length === 9 && /^[567]/.test(digitsOnly)) {
    return `0${digitsOnly}`;
  }
  return digitsOnly;
};

export function isValidDzMobile(raw: string): boolean {
  return DZ_MOBILE_PATTERN.test(normalizeDzPhone(raw));
}

// Display format "0555 12 34 56". Input that is not a valid mobile number is returned unchanged,
// so what the player typed is never altered.
export function formatDzPhone(raw: string): string {
  const phone = normalizeDzPhone(raw);
  if (!DZ_MOBILE_PATTERN.test(phone)) return raw;
  return `${phone.slice(0, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 8)} ${phone.slice(8)}`;
}

// The phone as the player types it, grouped for reading: "0555 12 34 56", "555 12 34 56",
// "+213 555 12 34 56". Only digits and a leading "+" are kept, up to a full number. The
// value sent is normalized anyway (normalizeDzPhone).
export function formatPhoneInput(raw: string): string {
  const plus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  const group = (value: string, sizes: number[]) => {
    const parts: string[] = [];
    let start = 0;
    for (const size of sizes) {
      const part = value.slice(start, start + size);
      if (part) parts.push(part);
      start += size;
    }
    return parts.join(" ");
  };
  if (plus || digits.startsWith("213")) {
    return (plus ? "+" : "") + group(digits, [3, 3, 2, 2, 2]);
  }
  if (/^[567]/.test(digits)) return group(digits, [3, 2, 2, 2]);
  return group(digits, [4, 2, 2, 2]);
}
