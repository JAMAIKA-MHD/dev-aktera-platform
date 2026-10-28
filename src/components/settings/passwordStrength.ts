// How strong a new password looks, for the meter and the checklist of the Security tab. It
// only describes: what the save refuses is still AccountSettings' own rule (at least
// MIN_PASSWORD_LENGTH characters, both fields equal).

export const MIN_PASSWORD_LENGTH = 6; // what the save enforces

export interface PasswordRule {
  id: "length" | "case" | "number" | "symbol";
  label: string;
  met: boolean;
}

export function passwordRules(password: string): PasswordRule[] {
  return [
    {
      id: "length",
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: "case",
      label: "Upper and lower case letters",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { id: "number", label: "At least one number", met: /\d/.test(password) },
    {
      id: "symbol",
      label: "At least one symbol, such as ! ? #",
      met: /[^A-Za-z0-9\s]/.test(password),
    },
  ];
}

export const STRENGTH_LABELS = [
  "Weak",
  "Weak",
  "Fair",
  "Good",
  "Strong",
] as const;

// 0 (nothing typed) to 4: one level per rule met, a long password counting for more.
export function passwordLevel(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const met = passwordRules(password).filter((rule) => rule.met).length;
  const bonus = password.length >= 12 ? 1 : 0;
  return Math.max(1, Math.min(4, met + bonus - 1)) as 1 | 2 | 3 | 4;
}
