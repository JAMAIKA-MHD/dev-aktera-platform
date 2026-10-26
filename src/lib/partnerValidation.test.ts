import { describe, expect, it } from "vitest";
import { normalizePartner, validatePartner } from "./partnerValidation";
import type { RewardPartnerInput } from "../types";

const valid: RewardPartnerInput = {
  name: "Acme Gifts",
  description: "Gift cards",
  websiteUrl: "https://acme.example",
  contactName: "Sara",
  contactEmail: "sara@acme.example",
  contactPhone: "+213 551 23 45 67",
};

const withField = (changes: Partial<RewardPartnerInput>) => ({
  ...valid,
  ...changes,
});

describe("validatePartner", () => {
  it("accepts a complete partner", () => {
    expect(validatePartner(valid)).toEqual({});
  });

  it("only needs the name", () => {
    expect(
      validatePartner({
        name: "Ab",
        description: "",
        websiteUrl: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      }),
    ).toEqual({});
  });

  it("asks for a name of at least 2 characters, 80 at most", () => {
    expect(validatePartner(withField({ name: "" })).name).toBeTruthy();
    expect(validatePartner(withField({ name: " a " })).name).toBeTruthy();
    expect(
      validatePartner(withField({ name: "x".repeat(81) })).name,
    ).toBeTruthy();
    expect(
      validatePartner(withField({ name: "x".repeat(80) })).name,
    ).toBeUndefined();
  });

  it("limits the description to 300 characters", () => {
    expect(
      validatePartner(withField({ description: "x".repeat(301) })).description,
    ).toBeTruthy();
    expect(
      validatePartner(withField({ description: "x".repeat(300) })).description,
    ).toBeUndefined();
  });

  it("accepts only a full http(s) web address", () => {
    for (const bad of [
      "acme.example",
      "ftp://acme.example",
      "javascript:alert(1)",
      "https://",
    ]) {
      expect(
        validatePartner(withField({ websiteUrl: bad })).websiteUrl,
      ).toBeTruthy();
    }
    expect(
      validatePartner(withField({ websiteUrl: "http://acme.example/x?y=1" }))
        .websiteUrl,
    ).toBeUndefined();
  });

  it("checks the email shape", () => {
    expect(
      validatePartner(withField({ contactEmail: "nope" })).contactEmail,
    ).toBeTruthy();
    expect(
      validatePartner(withField({ contactEmail: "a@b" })).contactEmail,
    ).toBeTruthy();
    expect(
      validatePartner(withField({ contactEmail: "a b@c.d" })).contactEmail,
    ).toBeTruthy();
    expect(
      validatePartner(withField({ contactEmail: "a@b.dz" })).contactEmail,
    ).toBeUndefined();
  });

  it("accepts the usual ways to write a phone number, not letters", () => {
    for (const ok of ["0551234567", "+213 551 23 45 67", "(021) 23-45-67"]) {
      expect(
        validatePartner(withField({ contactPhone: ok })).contactPhone,
      ).toBeUndefined();
    }
    for (const bad of ["call me", "12", "05512345678901234567890123456789"]) {
      expect(
        validatePartner(withField({ contactPhone: bad })).contactPhone,
      ).toBeTruthy();
    }
  });
});

describe("normalizePartner", () => {
  it("trims, and stores empty text as null", () => {
    expect(
      normalizePartner({
        name: "  Acme Gifts ",
        description: "   ",
        websiteUrl: " https://acme.example ",
        contactName: "",
        contactEmail: "",
        contactPhone: " 0551234567 ",
      }),
    ).toEqual({
      name: "Acme Gifts",
      description: null,
      website_url: "https://acme.example",
      contact_name: null,
      contact_email: null,
      contact_phone: "0551234567",
    });
  });
});
