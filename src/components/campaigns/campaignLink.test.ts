import { describe, expect, it } from "vitest";

import {
  campaignPublicUrl,
  facebookShareUrl,
  whatsappShareUrl,
} from "./campaignLink";

describe("campaignPublicUrl", () => {
  it.each([
    ["http://localhost:3000", "http://127.0.0.1:3000/play/abc"],
    ["http://[::1]:3000", "http://127.0.0.1:3000/play/abc"],
    ["http://0.0.0.0:3000", "http://127.0.0.1:3000/play/abc"],
    ["http://127.0.0.1:3000", "http://127.0.0.1:3000/play/abc"],
  ])("writes a local address as an IP: %s", (origin, expected) => {
    expect(campaignPublicUrl("abc", origin)).toBe(expected);
  });

  it("keeps a real address as it is", () => {
    expect(campaignPublicUrl("abc", "https://app.example.com")).toBe(
      "https://app.example.com/play/abc",
    );
    expect(campaignPublicUrl("abc", "http://192.168.1.20:3000")).toBe(
      "http://192.168.1.20:3000/play/abc",
    );
  });
});

describe("share links", () => {
  const link = "https://app.example.com/play/abc";

  it("hands the link to WhatsApp with the campaign's name", () => {
    expect(whatsappShareUrl(link, "Ramadan & Co")).toBe(
      `https://wa.me/?text=${encodeURIComponent(`Ramadan & Co ${link}`)}`,
    );
  });

  it("hands the link to Facebook", () => {
    expect(facebookShareUrl(link)).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    );
  });
});
