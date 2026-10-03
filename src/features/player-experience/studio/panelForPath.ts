import type { StudioPanel } from "./store";

// Which panel edits a configuration path: where a click in the preview (xp:edit-target), a
// design issue (T6.8) or a layout issue (T6.10) leads. Paths are the dot paths of
// DesignIssue.path and data-xp-edit, e.g. "screens.welcome.title" or "form.consent.text".
const ROOTS: Readonly<Record<string, StudioPanel>> = {
  templateId: "template",
  theme: "brand",
  brand: "brand",
  screens: "sections",
  locales: "sections",
  sections: "sections",
  form: "sections",
  game: "sections",
  prizeDisplay: "sections",
  legal: "legal",
  features: "share",
};

export function panelForPath(path: string): StudioPanel | null {
  return ROOTS[path.split(".")[0]] ?? null;
}
