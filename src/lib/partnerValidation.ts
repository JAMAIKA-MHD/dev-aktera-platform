import type { RewardPartnerInput } from "../types";

// Rules of the "Add a partner" form. They mirror the CHECK constraints of reward_partners, so a
// brand sees a clear message before the database would refuse the row.

export type PartnerErrors = Partial<Record<keyof RewardPartnerInput, string>>;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^[+0-9 ().-]{6,30}$/;

export const PARTNER_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  description: 300,
  website: 200,
  contactName: 80,
  email: 120,
} as const;

export function validatePartner(input: RewardPartnerInput): PartnerErrors {
  const errors: PartnerErrors = {};

  const name = input.name.trim();
  if (name.length < PARTNER_LIMITS.nameMin) {
    errors.name = "Enter the partner's name (at least 2 characters).";
  } else if (name.length > PARTNER_LIMITS.nameMax) {
    errors.name = `The name is limited to ${PARTNER_LIMITS.nameMax} characters.`;
  }

  if (input.description.trim().length > PARTNER_LIMITS.description) {
    errors.description = `The description is limited to ${PARTNER_LIMITS.description} characters.`;
  }

  const website = input.websiteUrl.trim();
  if (website) {
    let valid = false;
    try {
      const url = new URL(website);
      valid = url.protocol === "http:" || url.protocol === "https:";
    } catch {
      valid = false;
    }
    if (!valid || website.length > PARTNER_LIMITS.website) {
      errors.websiteUrl = "Enter a full web address, starting with https://";
    }
  }

  if (input.contactName.trim().length > PARTNER_LIMITS.contactName) {
    errors.contactName = `The name is limited to ${PARTNER_LIMITS.contactName} characters.`;
  }

  const email = input.contactEmail.trim();
  if (email && (!EMAIL.test(email) || email.length > PARTNER_LIMITS.email)) {
    errors.contactEmail = "Enter a valid email address.";
  }

  const phone = input.contactPhone.trim();
  if (phone && !PHONE.test(phone)) {
    errors.contactPhone = "Enter a valid phone number.";
  }

  return errors;
}

/** Empty text becomes null, the rest is trimmed: what the database stores. */
export function normalizePartner(input: RewardPartnerInput) {
  const clean = (value: string) => value.trim() || null;
  return {
    name: input.name.trim(),
    description: clean(input.description),
    website_url: clean(input.websiteUrl),
    contact_name: clean(input.contactName),
    contact_email: clean(input.contactEmail),
    contact_phone: clean(input.contactPhone),
  };
}
