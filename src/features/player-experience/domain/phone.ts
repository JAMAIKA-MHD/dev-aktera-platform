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
