// The template library (plan §9.2): the only templates a configuration may name. A template
// keeps the 8-slot layout (rule 2: layout is code) and gives every screen its own look —
// stage, panel, fonts, buttons, fields and game. Brands pick one in the Studio's library;
// they never build or position one. The list is closed: save_experience_config refuses any
// other id (migration 20261020120000_experience_templates.sql), and the schema repairs one.
export const TEMPLATE_IDS = [
  "eight-slot", // the original look, styled by the theme presets alone
  "comic-burst",
  "pixel-quest",
  "arcade-night",
  "quiz-show",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE_ID: TemplateId = "eight-slot";

export function isTemplateId(value: unknown): value is TemplateId {
  return (
    typeof value === "string" &&
    (TEMPLATE_IDS as readonly string[]).includes(value)
  );
}
