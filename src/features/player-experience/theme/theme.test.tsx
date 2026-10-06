import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MIN_TEXT_CONTRAST, contrastRatio } from "../domain/contrast";
import type { ThemeTokens } from "../domain/types";
import { THEME_PRESETS, themeFromPreset } from "../presets/themePresets";
import { backgroundStyle } from "./backgrounds";
import { ensureFontStylesheet, fontStack } from "./fonts";
import { ThemeScope } from "./ThemeScope";
import {
  RADIUS_SCALE,
  mixHex,
  mutedTextColor,
  statusColor,
  tokensToCssVars,
} from "./tokens";

const HEX = /#[0-9a-f]{3,8}\b/i;
const withBackground = (
  kind: ThemeTokens["background"]["kind"],
  changes: Partial<ThemeTokens["background"]> = {},
): ThemeTokens => {
  const theme = themeFromPreset("midnight-gold");
  theme.background = { ...theme.background, kind, ...changes };
  return theme;
};

afterEach(() => {
  document.head
    .querySelectorAll("link[id^='xp-font-']")
    .forEach((link) => link.remove());
});

describe("mixHex", () => {
  it("mixes two colors, from the first (0) to the second (1)", () => {
    expect(mixHex("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mixHex("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
    expect(mixHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mixHex("#F5BA41", "#0A1120", 0.25)).toBe("#BA9039");
  });

  it("leaves a color it cannot read unchanged", () => {
    expect(mixHex("red", "#FFFFFF", 0.5)).toBe("red");
    expect(mixHex("#FFFFFF", "#abc", 0.5)).toBe("#FFFFFF");
  });
});

describe("tokensToCssVars", () => {
  it("exposes every token as a --xp- variable", () => {
    const vars = tokensToCssVars(themeFromPreset("midnight-gold"));
    expect(vars).toMatchObject({
      "--xp-primary": "#F5BA41",
      "--xp-secondary": "#FBBF24",
      "--xp-accent": "#10B981",
      "--xp-surface": "#0A1120",
      "--xp-text": "#FFFFFF",
      "--xp-on-primary": "#0A1120", // dark text on gold, as in the reference screen
      "--xp-radius-pill": "9999px",
      "--xp-font": '"Poppins", "Noto Sans Arabic", system-ui, sans-serif',
    });
    expect(Object.keys(vars).every((key) => key.startsWith("--xp-"))).toBe(
      true,
    );
  });

  it("keeps every text readable, for every preset (WCAG AA)", () => {
    for (const preset of THEME_PRESETS) {
      const vars = tokensToCssVars(themeFromPreset(preset.id));
      const surface = vars["--xp-surface"];
      const onPrimary = vars["--xp-on-primary"];
      const pairs: [string, string, string][] = [
        ["text", vars["--xp-text"], surface],
        ["muted text", vars["--xp-text-muted"], surface],
        ["button", onPrimary, vars["--xp-primary"]],
        ["button, light end", onPrimary, vars["--xp-primary-light"]],
        ["button, deep end", onPrimary, vars["--xp-primary-deep"]],
        ["valid field", vars["--xp-success"], surface],
        ["error", vars["--xp-danger"], surface],
      ];
      for (const [name, ink, paper] of pairs) {
        expect(
          contrastRatio(ink, paper),
          `${preset.id}: ${name}`,
        ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      }
      // Still a gradient: the deep end always differs. The light end may stay on the
      // primary color when lightening it would make the button text unreadable.
      expect(vars["--xp-primary-deep"]).not.toBe(vars["--xp-primary"]);
    }
  });

  it("lightens the button only as far as its text stays readable", () => {
    // Dark text on gold: plenty of room, the light end is clearly lighter.
    expect(
      tokensToCssVars(themeFromPreset("midnight-gold"))["--xp-primary-light"],
    ).toBe(mixHex("#F5BA41", "#FFFFFF", 0.45));
    // White text on red at 4.70:1: no room, the light end stays on the primary color.
    expect(
      tokensToCssVars(themeFromPreset("telecom-red"))["--xp-primary-light"],
    ).toBe("#E11D48");
  });

  it("fades the secondary text as far as contrast allows", () => {
    const muted = mutedTextColor("#FFFFFF", "#0A1120");
    expect(muted).not.toBe("#FFFFFF");
    expect(contrastRatio(muted, "#0A1120")).toBeGreaterThanOrEqual(4.5);
    // Text barely readable already: kept as is.
    expect(mutedTextColor("#777777", "#FFFFFF")).toBe("#777777");
  });

  it("gives the status colors the hue of their meaning, readable on the surface", () => {
    // On a dark surface, the green and the red are readable as they are.
    expect(statusColor("#22C55E", "#0A1120")).toBe("#22C55E");
    // On white, they darken only until they reach the text contrast.
    const green = statusColor("#22C55E", "#FFFFFF");
    expect(green).not.toBe("#22C55E");
    expect(contrastRatio(green, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(mixHex("#22C55E", "#000000", 0.15), "#FFFFFF"),
    ).toBeLessThan(4.5);
    // A surface on which no mix is enough still gets the strongest one.
    expect(statusColor("#22C55E", "#7F7F7F")).toBe(
      mixHex("#22C55E", "#000000", 0.75),
    );
  });

  it("follows the radius style of the theme", () => {
    for (const radius of ["sharp", "rounded", "pill"] as const) {
      const theme = { ...themeFromPreset("clean-light"), radius };
      expect(tokensToCssVars(theme)["--xp-radius-md"]).toBe(
        RADIUS_SCALE[radius].md,
      );
    }
    expect(RADIUS_SCALE.sharp.pill).toBe("4px"); // square buttons stay square
  });
});

describe("backgroundStyle", () => {
  it("draws every kind from the theme variables only", () => {
    for (const kind of ["solid", "gradient", "mesh", "dots"] as const) {
      const style = backgroundStyle(withBackground(kind), null);
      expect(JSON.stringify(style), kind).not.toMatch(HEX);
      expect(style.backgroundColor).toBe("var(--xp-surface)");
    }
    expect(
      backgroundStyle(withBackground("mesh"), null).backgroundImage,
    ).toContain("color-mix(in srgb, var(--xp-primary) 30%, transparent)");
    expect(backgroundStyle(withBackground("dots"), null).backgroundSize).toBe(
      "16px 16px",
    );
  });

  it("covers the screen with the image, under a veil, centered on its focus point", () => {
    const style = backgroundStyle(
      withBackground("image", { overlayOpacity: 0.6, focus: { x: 30, y: 70 } }),
      "https://cdn.example.com/bg.webp",
    );
    expect(style).toMatchObject({
      backgroundSize: "cover",
      backgroundPosition: "30% 70%",
      backgroundRepeat: "no-repeat",
    });
    expect(style.backgroundImage).toBe(
      'linear-gradient(color-mix(in srgb, var(--xp-surface) 60%, transparent), color-mix(in srgb, var(--xp-surface) 60%, transparent)), url("https://cdn.example.com/bg.webp")',
    );
  });

  it("falls back to the gradient when the image is missing", () => {
    expect(backgroundStyle(withBackground("image"), null)).toEqual(
      backgroundStyle(withBackground("gradient"), null),
    );
  });
});

describe("fonts", () => {
  it("always keeps Noto Sans Arabic in the stack", () => {
    expect(fontStack("poppins")).toContain('"Noto Sans Arabic"');
    expect(fontStack("plus-jakarta")).toMatch(
      /^"Plus Jakarta Sans", "Noto Sans Arabic"/,
    );
  });

  it("loads Plus Jakarta Sans once, and nothing for Poppins", () => {
    ensureFontStylesheet(document, "poppins");
    expect(document.head.querySelectorAll("link[id^='xp-font-']")).toHaveLength(
      0,
    );
    ensureFontStylesheet(document, "plus-jakarta");
    ensureFontStylesheet(document, "plus-jakarta");
    const links = document.head.querySelectorAll("link#xp-font-plus-jakarta");
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLLinkElement).href).toContain("Plus+Jakarta+Sans");
  });
});

describe("ThemeScope", () => {
  it("applies the variables, direction, language, font and background to its subtree", () => {
    const theme = themeFromPreset("obsidian-violet");
    const { container } = render(
      <ThemeScope theme={theme} locale="ar" className="extra">
        <p>مرحبا</p>
      </ThemeScope>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe("xp-root extra");
    expect(root.dir).toBe("rtl");
    expect(root.lang).toBe("ar");
    expect(root.dataset.xpMode).toBe("dark");
    expect(root.dataset.xpFont).toBe("poppins");
    expect(root.style.getPropertyValue("--xp-primary")).toBe("#7C3AED");
    expect(root.style.color).toBe("var(--xp-text)");
    expect(root.textContent).toBe("مرحبا");
  });

  it("reads left to right in French and English, and never touches the document", () => {
    const before = document.documentElement.outerHTML;
    const { container } = render(
      <ThemeScope theme={themeFromPreset("clean-light")} locale="fr" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.dir).toBe("ltr");
    expect(root.className).toBe("xp-root");
    expect(root.dataset.xpMode).toBe("light");
    expect(document.documentElement.getAttribute("dir")).toBeNull();
    expect(document.documentElement.outerHTML.length).toBeGreaterThanOrEqual(
      before.length,
    ); // only the rendered subtree was added
  });
});
