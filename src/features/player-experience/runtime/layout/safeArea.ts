import type { CSSProperties } from "react";

// Safe areas (notch, home indicator). layout.css sets --xp-safe-* to env(safe-area-inset-*)
// on :root; the Studio preview overrides them per device and orientation (safeAreaStyle on
// a wrapper of the runtime), since env() is always 0 in a desktop browser.

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// null: keep the real device insets from env().
export function safeAreaStyle(insets: SafeAreaInsets | null): CSSProperties {
  if (!insets) return {};
  return {
    "--xp-safe-top": `${insets.top}px`,
    "--xp-safe-right": `${insets.right}px`,
    "--xp-safe-bottom": `${insets.bottom}px`,
    "--xp-safe-left": `${insets.left}px`,
  } as CSSProperties;
}

// Without viewport-fit=cover, env(safe-area-inset-*) is always 0, even on an iPhone:
// index.html does not set it. Added to the runtime's own document when it mounts.
export function ensureViewportFitCover(doc: Document): void {
  let meta = doc.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) {
    meta = doc.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1";
    doc.head.appendChild(meta);
  }
  if (!/viewport-fit\s*=/.test(meta.content)) {
    meta.content = `${meta.content}, viewport-fit=cover`;
  }
}
