import type { LegalLink } from "./types";

// Where a footer link leads. Only https:, mailto: and tel: URLs ever become links: the
// runtime also receives configurations that did not go through the schema (preview bridge,
// fixtures), so the check is repeated at the last moment, where the <a> is drawn.

export type LegalLinkTarget =
  | { kind: "sheet" } // the legal sheet of the runtime (terms body)
  | { kind: "href"; href: string; external: boolean };

// The raw text must start with the scheme: browsers strip leading spaces and control
// characters from an href, so " javascript:" must never reach one. URL() then refuses what
// is not a URL at all ("https://" without a host) and normalizes the rest.
export function safeLinkUrl(url: string | undefined): string | null {
  if (!url || !/^(https:|mailto:|tel:)/i.test(url)) return null;
  try {
    return new URL(url).href;
  } catch {
    return null;
  }
}

// A safe URL wins. Without one, terms, privacy and support open the legal sheet, which
// names the organizer; a plain "url" link without a usable URL is not shown at all.
export function legalLinkTarget(link: LegalLink): LegalLinkTarget | null {
  const href = safeLinkUrl(link.url);
  if (href) {
    return { kind: "href", href, external: href.startsWith("https:") };
  }
  return link.kind === "url" ? null : { kind: "sheet" };
}
