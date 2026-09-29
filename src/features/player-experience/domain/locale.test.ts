import { describe, expect, it } from "vitest";
import {
  LOCALES,
  getDirection,
  hasText,
  localized,
  missingLocales,
  pickInitialLocale,
  resolveText,
  type LocalizedText,
} from "./locale";

describe("LOCALES", () => {
  it("lists the three player languages, French first", () => {
    expect(LOCALES).toEqual(["fr", "ar", "en"]);
  });
});

describe("resolveText", () => {
  const full: LocalizedText = { fr: "Bonjour", ar: "مرحبا", en: "Hello" };

  it("returns the requested locale when it is filled", () => {
    expect(resolveText(full, "ar")).toBe("مرحبا");
    expect(resolveText(full, "en")).toBe("Hello");
  });

  it("returns an empty string for a missing or empty text", () => {
    expect(resolveText(undefined, "fr")).toBe("");
    expect(resolveText({}, "fr")).toBe("");
    expect(resolveText({ fr: "", ar: "   ", en: "" }, "ar")).toBe("");
  });

  it("treats whitespace-only values as missing", () => {
    expect(resolveText({ fr: "Bonjour", ar: "  " }, "ar")).toBe("Bonjour");
  });

  it("prefers the configured default locale over the built-in chain", () => {
    expect(resolveText({ fr: "Bonjour", en: "Hello" }, "ar", "en")).toBe(
      "Hello",
    );
  });

  it("falls back to French, then English, when the default is also missing", () => {
    expect(resolveText({ fr: "Bonjour", en: "Hello" }, "ar")).toBe("Bonjour");
    expect(resolveText({ en: "Hello" }, "ar", "fr")).toBe("Hello");
  });

  it("falls back to any remaining locale as a last resort", () => {
    expect(resolveText({ ar: "مرحبا" }, "en", "fr")).toBe("مرحبا");
  });

  it("returns the value unchanged, without trimming it", () => {
    expect(resolveText({ fr: " Bonjour " }, "fr")).toBe(" Bonjour ");
  });
});

describe("hasText", () => {
  it("is true only for a filled value in the given locale", () => {
    expect(hasText({ fr: "Bonjour" }, "fr")).toBe(true);
    expect(hasText({ fr: "Bonjour" }, "ar")).toBe(false);
    expect(hasText({ fr: "   " }, "fr")).toBe(false);
    expect(hasText(undefined, "fr")).toBe(false);
  });
});

describe("missingLocales", () => {
  it("lists enabled locales without text, in the enabled order", () => {
    expect(missingLocales({ fr: "Bonjour" }, ["en", "fr", "ar"])).toEqual([
      "en",
      "ar",
    ]);
  });

  it("returns every enabled locale for a missing text", () => {
    expect(missingLocales(undefined, LOCALES)).toEqual(["fr", "ar", "en"]);
  });

  it("returns nothing when every enabled locale is filled", () => {
    expect(
      missingLocales({ fr: "Bonjour", ar: "مرحبا" }, ["fr", "ar"]),
    ).toEqual([]);
    expect(missingLocales({ fr: "Bonjour" }, [])).toEqual([]);
  });
});

describe("pickInitialLocale", () => {
  const brand = { default: "fr" as const, enabled: ["fr", "ar"] as const };

  it("uses the first language of the phone that the brand enabled", () => {
    expect(pickInitialLocale(brand, ["ar-DZ", "fr"])).toBe("ar");
    expect(pickInitialLocale(brand, ["en-US", "fr-FR"])).toBe("fr");
  });

  it("falls back to the brand's default language", () => {
    expect(pickInitialLocale(brand, ["en-US", "de"])).toBe("fr");
    expect(pickInitialLocale(brand, [])).toBe("fr");
  });
});

describe("getDirection", () => {
  it("is right-to-left for Arabic only", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("fr")).toBe("ltr");
    expect(getDirection("en")).toBe("ltr");
  });
});

describe("localized", () => {
  it("keeps only the provided translations", () => {
    expect(localized("Bonjour")).toEqual({ fr: "Bonjour" });
    expect(localized("Bonjour", "مرحبا", "Hello")).toEqual({
      fr: "Bonjour",
      ar: "مرحبا",
      en: "Hello",
    });
  });

  it("never serializes undefined keys", () => {
    const text = localized("Bonjour", undefined, "Hello");
    expect(Object.keys(text)).toEqual(["fr", "en"]);
    expect(JSON.parse(JSON.stringify(text))).toEqual(text);
  });
});
