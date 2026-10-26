import { describe, expect, it } from "vitest";
import { createDefaultExperience } from "../domain/defaults";
import { parseExperienceConfig } from "../domain/schema";
import { TEMPLATE_IDS, isTemplateId } from "../domain/templates";
import { validateExperience } from "../domain/validation";
import { manifestToCssVars, themedTokens } from "../theme/shellVars";
import { EXPERIENCE_TEMPLATES, getTemplate, hasStage } from "./templates";
import { getThemeManifest } from "./themeManifests";
import { findPreset, themeFromPreset } from "./themePresets";

describe("template library", () => {
  it("describes every template id, in the order of the library", () => {
    expect(EXPERIENCE_TEMPLATES.map((template) => template.id)).toEqual([
      ...TEMPLATE_IDS,
    ]);
    expect(getTemplate("eight-slot").presetId).toBeNull();
    expect(getTemplate("not-a-template").id).toBe("eight-slot");
    expect(isTemplateId("comic-burst")).toBe(true);
    expect(isTemplateId("my-own-template")).toBe(false);
  });

  it("reads each staged template from its theme.json: palette, fonts, label", () => {
    for (const template of EXPERIENCE_TEMPLATES.filter((t) => hasStage(t.id))) {
      const manifest = getThemeManifest(template.id);
      const palette = findPreset(template.presetId);
      expect(palette?.template).toBe(true);
      expect(palette?.tokens.colors.surface).toBe(manifest?.palette.surface);
      expect(template.label).toBe(manifest?.label);
      expect(template.source).toMatch(/^style\d-/);
      expect(template.fonts?.stylesheet).toMatch(
        /^https:\/\/fonts\.googleapis\.com\/css2\?/,
      );
    }
  });

  it("passes the design checks with every template palette (contrast of text and button)", () => {
    for (const template of EXPERIENCE_TEMPLATES.filter((t) => hasStage(t.id))) {
      const config = {
        ...createDefaultExperience({ gameType: "lucky_wheel" }),
        templateId: template.id,
        theme: themeFromPreset(template.presetId ?? undefined),
      };
      const contrast = validateExperience(config).filter((issue) =>
        issue.id.startsWith("contrast"),
      );
      expect(contrast, template.id).toEqual([]);
    }
  });

  it("turns a theme.json into the shell's CSS variables, roles written out", () => {
    const manifest = getThemeManifest("quiz-show")!;
    const vars = manifestToCssVars(manifest, null);
    expect(vars["--xp-font-display"]).toMatch(/^"Outfit", "Noto Sans Arabic"/);
    // The bundled file, inlined as a data URL when it is small.
    expect(vars["--xp-panel-frame"]).toMatch(
      /^url\("(?:data:image\/svg\+xml,|\/).+"\)$/,
    );
    expect(vars["--xp-panel-frame-slice"]).toBe("100 fill");
    expect(vars["--xp-panel-frame-repeat"]).toBe("round"); // the bulbs keep their spacing
    // No "@role" is ever left for the browser to read.
    for (const [name, value] of Object.entries(vars)) {
      expect(value, name).not.toMatch(/@[a-z]/);
    }
  });

  it("lets a brand recolor primary and accent, and nothing else", () => {
    const manifest = getThemeManifest("comic-burst")!;
    const vars = manifestToCssVars(manifest, {
      primary: "#00A86B",
      accent: "#FF00AA",
    });
    expect(vars["--xp-btn-bg"]).toContain("#00A86B"); // "@primary"
    expect(vars["--xp-wheel-hub"]).toBe("#00A86B");
    expect(vars["--xp-panel-bg"]).toBe(manifest.panel.bg); // the theme's own

    const brand = themeFromPreset("comic-burst");
    const customized = {
      ...brand,
      presetId: null,
      colors: {
        ...brand.colors,
        primary: "#00A86B",
        surface: "#FFFFFF", // not the brand's to change on a template
      },
    };
    const tokens = themedTokens(customized, manifest);
    expect(tokens.colors.primary).toBe("#00A86B");
    expect(tokens.colors.surface).toBe(manifest.palette.surface);
    // Still on the template's own palette: today's theme.json, whatever was saved.
    const stale = { ...brand, colors: { ...brand.colors, primary: "#123456" } };
    expect(themedTokens(stale, manifest).colors.primary).toBe(
      manifest.palette.primary,
    );
  });
});

describe("templateId in a stored configuration", () => {
  it("keeps any template of the library", () => {
    for (const templateId of TEMPLATE_IDS) {
      const raw = {
        ...createDefaultExperience({ gameType: "quiz" }),
        templateId,
      };
      const parsed = parseExperienceConfig(raw);
      expect(parsed.recovered).toBe(false);
      expect(parsed.config.templateId).toBe(templateId);
    }
  });

  it("repairs a template that is not in the library to the classic one", () => {
    const raw = {
      ...createDefaultExperience({ gameType: "quiz" }),
      templateId: "homemade",
    };
    const parsed = parseExperienceConfig(raw);
    expect(parsed.recovered).toBe(true);
    expect(parsed.config.templateId).toBe("eight-slot");
    expect(parsed.issues.some((issue) => issue.startsWith("templateId"))).toBe(
      true,
    );
  });
});
