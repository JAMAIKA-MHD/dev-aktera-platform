import { describe, expect, it } from "vitest";
import { legalLinkTarget, safeLinkUrl } from "./legal";
import type { LegalLink } from "./types";

const link = (kind: LegalLink["kind"], url?: string): LegalLink => ({
  id: "link",
  kind,
  label: { fr: "Lien" },
  ...(url === undefined ? {} : { url }),
});

describe("safeLinkUrl", () => {
  it("keeps https:, mailto: and tel: URLs", () => {
    expect(safeLinkUrl("https://zeta.dz/reglement")).toBe(
      "https://zeta.dz/reglement",
    );
    expect(safeLinkUrl("HTTPS://zeta.dz")).toBe("https://zeta.dz/");
    expect(safeLinkUrl("mailto:contact@zeta.dz")).toBe(
      "mailto:contact@zeta.dz",
    );
    expect(safeLinkUrl("tel:+213541234567")).toBe("tel:+213541234567");
  });

  it("refuses every other scheme, and what a browser would turn into one", () => {
    for (const url of [
      undefined,
      "",
      "javascript:alert(1)",
      " javascript:alert(1)",
      "\njavascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "http://zeta.dz",
      "//zeta.dz",
      "/reglement",
      "vbscript:msgbox(1)",
      "https://", // no host: URL() refuses it
    ]) {
      expect(safeLinkUrl(url), String(url)).toBeNull();
    }
  });
});

describe("legalLinkTarget", () => {
  it("opens a safe URL, in a new tab for https: only", () => {
    expect(legalLinkTarget(link("support", "https://zeta.dz/aide"))).toEqual({
      kind: "href",
      href: "https://zeta.dz/aide",
      external: true,
    });
    expect(legalLinkTarget(link("support", "tel:0541234567"))).toEqual({
      kind: "href",
      href: "tel:0541234567",
      external: false,
    });
  });

  it("opens the legal sheet for terms, privacy and support without a usable URL", () => {
    expect(legalLinkTarget(link("terms"))).toEqual({ kind: "sheet" });
    expect(legalLinkTarget(link("privacy", "javascript:alert(1)"))).toEqual({
      kind: "sheet",
    });
    expect(legalLinkTarget(link("support", "http://zeta.dz"))).toEqual({
      kind: "sheet",
    });
  });

  it("hides a plain link without a usable URL", () => {
    expect(legalLinkTarget(link("url"))).toBeNull();
    expect(legalLinkTarget(link("url", "javascript:alert(1)"))).toBeNull();
  });
});
