import type { LocalizedText } from "../../domain/locale";
import type { ScreenContent } from "../../domain/types";

// Content of a screen that brands do not edit (waiting, status, unavailable): the frame
// draws it like any other screen, from texts of presets/contentDefaults.ts.
export function textContent(texts: {
  title: LocalizedText;
  subtitle: LocalizedText;
  primaryCta?: LocalizedText; // none: no CTA
  secondaryCta?: LocalizedText;
}): ScreenContent {
  return {
    showHeader: true,
    hero: "none",
    title: texts.title,
    subtitle: texts.subtitle,
    reinforcement: { kind: "none", text: {} },
    primaryCta: texts.primaryCta ?? {},
    secondaryCta: texts.secondaryCta ?? null,
  };
}
