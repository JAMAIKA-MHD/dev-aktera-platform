import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { TITLE_CHARS_PER_LINE_AT_320 } from "../../domain/validation";
import { localized } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import { ExperienceFrame, type ExperienceFrameProps } from "./ExperienceFrame";
import {
  isArabicScript,
  spacedCaps,
  startsOnScreenSide,
  textDirection,
} from "./text";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAME_CSS = readFileSync(join(HERE, "frame.css"), "utf8");
const TITLE_SLOT = readFileSync(join(HERE, "slots/TitleSlot.tsx"), "utf8");

// Every slot the frame places, including the zones that T3.5 and T3.6 will fill.
const FRAME_SLOTS = [
  "header",
  "status",
  "hero",
  "title",
  "copy",
  "interaction",
  "sections",
  "reinforcement",
  "cta",
  "footer",
];

function zetaConfig(): ExperienceConfig {
  const config = createDefaultExperience({ gameType: "lucky_wheel" });
  config.brand.name = "Zeta Market";
  config.brand.tagline = localized(
    "Le bon prix, près de chez vous",
    "السعر المناسب، بالقرب منك",
  );
  return config;
}

function renderFrame(props: Partial<ExperienceFrameProps> = {}) {
  const config = props.config ?? zetaConfig();
  return render(
    <ExperienceFrame
      config={config}
      locale="fr"
      screenContent={config.screens.welcome}
      editPath="screens.welcome"
      {...props}
    />,
  );
}

const slot = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-xp-slot="${name}"]`);

// jsdom has no matchMedia: useLayoutMode follows the window size and its resize event.
function resizeTo(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
  });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

afterEach(() => resizeTo(1024, 768));

describe("ExperienceFrame", () => {
  it("fills slots 1 to 4 from the configuration, in the player's language", () => {
    const { container } = renderFrame({ locale: "ar" });
    const header = slot(container, "header");
    expect(header?.getAttribute("data-xp-edit")).toBe("brand");
    expect(header?.textContent).toContain("Zeta Market");
    expect(header?.textContent).toContain("السعر المناسب، بالقرب منك");

    const title = slot(container, "title");
    expect(title?.tagName).toBe("H1");
    expect(title?.textContent).toBe("أدر العجلة وجرّب حظك");
    expect(title?.getAttribute("dir")).toBe("auto");
    expect(title?.hasAttribute("data-xp-clamp")).toBe(true);
    expect(title?.className).toContain("line-clamp-2");
    expect(title?.getAttribute("data-xp-edit")).toBe("screens.welcome.title");

    const copy = slot(container, "copy");
    expect(copy?.textContent).toBe(
      "سجّل في ثوانٍ، ثم أدر العجلة لتكتشف إن كنت من الفائزين.",
    );
    expect(copy?.getAttribute("dir")).toBe("auto");
    expect(copy?.getAttribute("data-xp-edit")).toBe("screens.welcome.subtitle");
    // No hero on the reference welcome screen.
    expect(slot(container, "hero")).toBeNull();
  });

  it("falls back to the default language, and draws no empty slot", () => {
    const config = zetaConfig();
    config.brand.tagline = {};
    delete config.screens.welcome.title.en;
    config.screens.welcome.subtitle = { fr: "  " };
    const { container } = renderFrame({ config, locale: "en" });
    expect(slot(container, "title")?.textContent).toBe(
      "Tournez la roue et tentez votre chance",
    );
    expect(slot(container, "copy")).toBeNull();
    expect(slot(container, "header")?.querySelectorAll("p")).toHaveLength(1);
  });

  it("hides the header when the screen asks, and keeps the badge on its own row", () => {
    const config = zetaConfig();
    config.screens.welcome.showHeader = false;
    const { container, rerender } = renderFrame({
      config,
      statusBadge: "Demo",
    });
    expect(slot(container, "header")).toBeNull();
    expect(slot(container, "status")?.textContent).toBe("Demo");
    rerender(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
      />,
    );
    expect(slot(container, "status")).toBeNull();
  });

  it("puts the badge and the live dot in the header", () => {
    const { container, rerender } = renderFrame({ statusBadge: "Demo" });
    const header = slot(container, "header");
    expect(header?.textContent).toContain("Demo");
    expect(screen.getByTestId("live-dot")).toBeTruthy();
    const config = zetaConfig();
    rerender(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
        live={false}
      />,
    );
    expect(screen.queryByTestId("live-dot")).toBeNull();
  });

  it("shows the hero, except on a low screen, where the layout drops it", () => {
    const config = zetaConfig();
    config.screens.welcome.hero = "timer";
    const { container } = renderFrame({ config });
    const hero = slot(container, "hero");
    expect(hero?.getAttribute("data-xp-hero")).toBe("timer");
    expect(hero?.getAttribute("data-xp-edit")).toBe("screens.welcome.hero");
    resizeTo(844, 390);
    expect(slot(container, "hero")).toBeNull();
    resizeTo(390, 844);
    expect(slot(container, "hero")).not.toBeNull();
  });

  it("gives the layout mode to the code, and keeps the same DOM from stack to split", () => {
    function Game() {
      const [spins, setSpins] = useState(0);
      return (
        <button type="button" onClick={() => setSpins(spins + 1)}>
          Spins {spins}
        </button>
      );
    }
    resizeTo(390, 844);
    const { container } = renderFrame({ children: <Game /> });
    const frame = container.querySelector<HTMLElement>(".xp-frame");
    expect(frame?.dataset.xpArrangement).toBe("stack");
    expect(frame?.dataset.xpDensity).toBe("regular");
    const game = screen.getByRole("button");
    fireEvent.click(game);

    resizeTo(1366, 657); // rotation, or the preview's resize handle
    expect(frame?.dataset.xpArrangement).toBe("split");
    // Same node, same state: the game of slot 5 was never remounted.
    expect(screen.getByRole("button")).toBe(game);
    expect(game.textContent).toBe("Spins 1");
    resizeTo(1920, 969);
    expect(frame?.dataset.xpDensity).toBe("roomy");
  });

  it("places the caller's content in slots 5 to 7, and omits the empty zones", () => {
    const { container, rerender } = renderFrame({
      children: <p>Wheel</p>,
      reinforcement: <p>1 try left</p>,
      cta: <button type="button">Start</button>,
    });
    expect(slot(container, "interaction")?.textContent).toBe("Wheel");
    expect(slot(container, "reinforcement")?.textContent).toBe("1 try left");
    expect(slot(container, "cta")?.textContent).toBe("Start");
    const config = zetaConfig();
    rerender(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
      />,
    );
    expect(slot(container, "interaction")).not.toBeNull(); // the game zone always exists
    expect(slot(container, "reinforcement")).toBeNull();
    expect(slot(container, "cta")).toBeNull();
  });

  it("points to no Studio field without an edit path (the public page)", () => {
    const config = zetaConfig();
    config.screens.welcome.hero = "badge";
    const { container } = render(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
      />,
    );
    const editable = [...container.querySelectorAll("[data-xp-edit]")].map(
      (element) => element.getAttribute("data-xp-edit"),
    );
    expect(editable).toEqual(["brand"]); // the brand is shared by every screen
  });

  it("shows the logo image, and the icon when there is none or it fails to load", () => {
    const { container, rerender } = renderFrame({ logoUrl: "/logo.png" });
    const image = container.querySelector("header img");
    expect(image?.getAttribute("src")).toBe("/logo.png");
    expect(image?.getAttribute("alt")).toBe(""); // the brand name follows as text
    fireEvent.error(image as Element);
    expect(container.querySelector("header img")).toBeNull();
    expect(screen.getByTestId("brand-icon")).toBeTruthy();

    const config = zetaConfig();
    const props = {
      config,
      locale: "fr" as const,
      screenContent: config.screens.welcome,
    };
    rerender(<ExperienceFrame {...props} logoUrl="/other.png" />);
    expect(container.querySelector("header img")?.getAttribute("src")).toBe(
      "/other.png",
    );
    rerender(<ExperienceFrame {...props} />);
    expect(container.querySelector("header img")).toBeNull();
  });

  it("starts every text on the screen's reading side, whatever its script", () => {
    const config = zetaConfig();
    config.screens.welcome.title = { fr: "Tentez votre chance" }; // no Arabic yet
    config.screens.welcome.subtitle = { fr: "Inscrivez-vous, puis jouez." };
    const { container } = renderFrame({ config, locale: "ar" });
    const [name, tagline] =
      slot(container, "header")?.querySelectorAll("p") ?? [];
    // dir="auto" gives the Latin name its own start (left): its end is the screen's start.
    expect(name.getAttribute("dir")).toBe("auto");
    expect(name.className).toContain("text-end");
    expect(tagline.className).toContain("text-start");
    expect(slot(container, "title")?.className).toContain("split:text-end");
    expect(slot(container, "copy")?.className).toContain("split:text-end");
  });

  it("never spaces or capitalizes Arabic text (D6)", () => {
    const config = zetaConfig();
    config.brand.name = "متجر زيتا";
    const { container, rerender } = renderFrame({ config, locale: "ar" });
    const name = () => slot(container, "header")?.querySelector("p");
    expect(name()?.className).not.toContain("uppercase");
    expect(name()?.className).not.toContain("tracking");
    expect(slot(container, "title")?.className).not.toContain("tracking");
    expect(slot(container, "title")?.className).toContain("leading-[1.45]");

    config.brand.name = "Zeta Market";
    rerender(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
      />,
    );
    expect(name()?.className).toContain("uppercase");
    expect(slot(container, "title")?.className).toContain("tracking-tight");
  });

  it("turns its own motion off when the brand disables animations", () => {
    const config = zetaConfig();
    const { container, rerender } = renderFrame({ config });
    const frame = () => container.querySelector(".xp-frame");
    expect(frame()?.hasAttribute("data-xp-motion")).toBe(false);
    config.features.animations = false;
    rerender(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
      />,
    );
    expect(frame()?.getAttribute("data-xp-motion")).toBe("off");
  });
});

describe("frame.css", () => {
  const templates = [
    ...FRAME_CSS.matchAll(/grid-template-areas:([^;]+);/g),
  ].map((match) =>
    [...match[1].matchAll(/"([^"]+)"/g)].map((row) =>
      row[1].trim().split(/\s+/),
    ),
  );
  const rowCounts = [...FRAME_CSS.matchAll(/grid-template-rows:([^;]+);/g)].map(
    (match) => match[1].trim().split(/\s+/).length,
  );

  it("gives every slot of the frame a grid area, in the stack and split templates", () => {
    expect(templates).toHaveLength(2); // stack, then split
    const placed = [
      ...FRAME_CSS.matchAll(
        /\[data-xp-slot="([a-z]+)"\]\s*\{\s*grid-area:\s*([a-z]+);/g,
      ),
    ].map((match) => [match[1], match[2]]);
    expect(placed.map(([name]) => name).sort()).toEqual(
      [...FRAME_SLOTS].sort(),
    );
    for (const [, area] of placed) {
      for (const template of templates) expect(template.flat()).toContain(area);
    }
  });

  it("uses valid templates: equal rows, one row track per row, rectangular areas", () => {
    expect(rowCounts).toEqual(templates.map((template) => template.length));
    for (const template of templates) {
      const columns = template[0].length;
      expect(template.every((row) => row.length === columns)).toBe(true);
      // A non-rectangular area would make the browser drop the whole template.
      for (const area of new Set(
        template.flat().filter((name) => name !== "."),
      )) {
        const cells = template.flatMap((row, y) =>
          row.flatMap((name, x) => (name === area ? [[y, x]] : [])),
        );
        const ys = cells.map(([y]) => y);
        const xs = cells.map(([, x]) => x);
        const height = Math.max(...ys) - Math.min(...ys) + 1;
        const width = Math.max(...xs) - Math.min(...xs) + 1;
        expect(cells.length, area).toBe(height * width);
      }
    }
  });

  it("sizes the title on its column, so that a title the design checks accept always fits", () => {
    // Widest average advance measured in Chrome for Poppins ExtraBold titles: 0.565 em per
    // character (0.54 with the tight tracking). The cap must leave at least that much room
    // for the 22 characters per line that validation.ts promises.
    const divisor = Number(
      /--xp-title-max:\s*calc\(var\(--xp-text-width\)\s*\/\s*([\d.]+)\)/.exec(
        FRAME_CSS,
      )?.[1],
    );
    expect(divisor / TITLE_CHARS_PER_LINE_AT_320).toBeGreaterThanOrEqual(0.565);
    expect(TITLE_SLOT.match(/var\(--xp-title-max\)/g)).toHaveLength(2); // stack and split
  });

  it("renders only slots that frame.css places", () => {
    const config = zetaConfig();
    config.screens.welcome.hero = "gift";
    const { container } = renderFrame({
      config,
      statusBadge: "Demo",
      reinforcement: <p>Hint</p>,
      cta: <p>CTA</p>,
    });
    const rendered = [
      ...container.querySelectorAll(".xp-frame > [data-xp-slot]"),
    ].map((element) => element.getAttribute("data-xp-slot"));
    expect(rendered).toEqual([
      "header",
      "hero",
      "title",
      "copy",
      "interaction",
      "reinforcement",
      "cta",
    ]);
    for (const name of rendered) expect(FRAME_SLOTS).toContain(name);
  });
});

describe("text helpers", () => {
  it("reads the script from the text itself", () => {
    expect(isArabicScript("مرحبا")).toBe(true);
    expect(isArabicScript("Zeta ماركت")).toBe(true);
    expect(isArabicScript("ﷺ")).toBe(true); // presentation forms
    expect(isArabicScript("Zeta Market")).toBe(false);
    expect(isArabicScript("")).toBe(false);
    expect(spacedCaps("Zeta", "uppercase")).toBe("uppercase");
    expect(spacedCaps("زيتا", "uppercase")).toBe("");
  });

  it("finds the direction dir=auto gives a text, from its first strong character", () => {
    expect(textDirection("Zeta Market")).toBe("ltr");
    expect(textDirection("Évasion")).toBe("ltr");
    expect(textDirection("متجر زيتا")).toBe("rtl");
    expect(textDirection("2026 : Zeta")).toBe("ltr"); // digits are skipped
    expect(textDirection("٥٠٠٠ دج")).toBe("rtl"); // Arabic-Indic digits too
    expect(textDirection("٥ Zeta")).toBe("ltr");
    expect(textDirection("2026 !")).toBeNull();
    expect(startsOnScreenSide("Zeta Market", "rtl")).toBe(false);
    expect(startsOnScreenSide("Zeta Market", "ltr")).toBe(true);
    expect(startsOnScreenSide("متجر زيتا", "rtl")).toBe(true);
    expect(startsOnScreenSide("2026", "rtl")).toBe(true);
  });
});
