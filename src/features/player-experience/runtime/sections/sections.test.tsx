import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { localized, type Locale } from "../../domain/locale";
import type { ExperienceConfig, PrizeChip } from "../../domain/types";
import { ExperienceFrame } from "../frame/ExperienceFrame";

// Jackpot card and prize chips (T3.6), drawn by the frame on the welcome screen.

const FRAME_CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../frame/frame.css"),
  "utf8",
);

function renderWelcome(
  config: ExperienceConfig = createDefaultExperience({
    gameType: "lucky_wheel",
  }),
  {
    locale = "fr",
    showSections = true,
  }: { locale?: Locale; showSections?: boolean } = {},
) {
  return render(
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={config.screens.welcome}
      showSections={showSections}
    />,
  );
}

const sections = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-xp-slot="sections"]');

function chip(index: number): PrizeChip {
  return {
    id: `chip-${index}`,
    icon: "gift",
    value: localized(`Lot ${index}`),
    caption: localized(`Légende ${index}`),
    tone: "accent",
  };
}

describe("jackpot card", () => {
  it("draws the configured eyebrow, headline, badge and icon, in the player's language", () => {
    const { container } = renderWelcome(undefined, { locale: "en" });
    const card = sections(container)?.querySelector<HTMLElement>(
      '[data-xp-edit="sections.jackpot"]',
    );
    expect(card?.textContent).toContain("Grand prize draw");
    expect(card?.textContent).toContain("Prizes to win every day");
    expect(card?.textContent).toContain("To win");
    expect(card?.querySelector("svg")).not.toBeNull();
    expect(card?.className).toContain("xp-breathe");
    // Colors derived from the brand color only.
    expect(card?.getAttribute("style")).toContain("var(--xp-primary)");
  });

  it("drops the parts left empty, and never capitalizes Arabic", () => {
    const config = createDefaultExperience({ gameType: "lucky_wheel" });
    config.sections.jackpot.badge = {};
    const { container } = renderWelcome(config, { locale: "ar" });
    const card = sections(container)?.querySelector(
      '[data-xp-edit="sections.jackpot"]',
    );
    expect(card?.textContent).toBe("المسابقة الكبرىجوائز للربح كل يوم");
    const eyebrow = card?.querySelector("p");
    expect(eyebrow?.className).not.toContain("uppercase");
    config.sections.jackpot.eyebrow = {};
    config.sections.jackpot.title = {};
    const empty = renderWelcome(config);
    expect(
      sections(empty.container)?.querySelector(
        '[data-xp-edit="sections.jackpot"] p',
      ),
    ).toBeNull();
  });

  it("clamps the headline to two lines, an intended cut", () => {
    const { container } = renderWelcome();
    const title = sections(container)?.querySelectorAll(
      "[data-xp-edit='sections.jackpot'] p",
    )[1];
    expect(title?.className).toContain("line-clamp-2");
    expect(title?.hasAttribute("data-xp-clamp")).toBe(true);
  });
});

describe("prize chips", () => {
  it("draws each chip with its icon in a theme color, its value and its caption", () => {
    const { container } = renderWelcome();
    const list = sections(container)?.querySelector("ul");
    expect(list?.getAttribute("data-xp-chips")).toBe("3");
    const items = [...(list?.querySelectorAll("li") ?? [])];
    expect(items.map((item) => item.textContent)).toEqual([
      "Bons d'achatÀ utiliser en magasin",
      "CadeauxOfferts par la marque",
      "RéductionsSur vos prochains achats",
    ]);
    const tones = items.map(
      (item) =>
        (item.querySelector("[aria-hidden]") as HTMLElement).style.color,
    );
    expect(tones).toEqual([
      "var(--xp-primary)",
      "var(--xp-secondary)",
      "var(--xp-accent)",
    ]);
    // Clamped rather than overflowing, never cut in the middle of the layout.
    for (const text of list?.querySelectorAll("li > span[dir]") ?? []) {
      expect(text.hasAttribute("data-xp-clamp")).toBe(true);
    }
  });

  it("shows 1 to 4 chips, and skips the empty ones", () => {
    const config = createDefaultExperience({ gameType: "lucky_wheel" });
    config.sections.prizeChips.items = [1, 2, 3, 4, 5].map(chip);
    const { container, rerender } = renderWelcome(config);
    expect(sections(container)?.querySelectorAll("li")).toHaveLength(4);
    expect(
      sections(container)?.querySelector("ul")?.getAttribute("data-xp-chips"),
    ).toBe("4");

    config.sections.prizeChips.items = [
      chip(1),
      { ...chip(2), value: {}, caption: { fr: " " } },
    ];
    rerender(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
        showSections
      />,
    );
    expect(
      sections(container)?.querySelector("ul")?.getAttribute("data-xp-chips"),
    ).toBe("1");

    config.sections.prizeChips.items = [{ ...chip(1), value: {}, caption: {} }];
    rerender(
      <ExperienceFrame
        config={config}
        locale="fr"
        screenContent={config.screens.welcome}
        showSections
      />,
    );
    expect(sections(container)?.querySelector("ul")).toBeNull();
    expect(sections(container)).not.toBeNull(); // the jackpot card is still there
  });
});

describe("placement", () => {
  it("draws the sections on the welcome screen only, when they are enabled", () => {
    const config = createDefaultExperience({ gameType: "lucky_wheel" });
    expect(
      sections(renderWelcome(config, { showSections: false }).container),
    ).toBeNull();

    config.sections.jackpot.enabled = false;
    const chipsOnly = sections(renderWelcome(config).container);
    expect(
      chipsOnly?.querySelector('[data-xp-edit="sections.jackpot"]'),
    ).toBeNull();
    expect(chipsOnly?.querySelector("ul")).not.toBeNull();

    config.sections.prizeChips.enabled = false;
    expect(sections(renderWelcome(config).container)).toBeNull();
  });

  it("comes right after the game in the DOM, under the copy in the split template", () => {
    const { container } = renderWelcome();
    const order = [
      ...container.querySelectorAll(".xp-frame > [data-xp-slot]"),
    ].map((element) => element.getAttribute("data-xp-slot"));
    expect(
      order.slice(
        order.indexOf("interaction"),
        order.indexOf("interaction") + 2,
      ),
    ).toEqual(["interaction", "sections"]);
    const [stack, split] = [
      ...FRAME_CSS.matchAll(/grid-template-areas:([^;]+);/g),
    ].map((match) =>
      [...match[1].matchAll(/"([^"]+)"/g)].map((row) => row[1].trim()),
    );
    expect(stack.indexOf(". sections .")).toBe(
      stack.indexOf(". interaction .") + 1,
    );
    const copy = split.indexOf(". copy . interaction .");
    expect(split[copy + 1]).toBe(". sections . interaction ."); // the end pane stays the game's
  });

  it("lays the chips out on the width really available, never 3 + 1", () => {
    expect(FRAME_CSS).toMatch(
      /\.xp-chips-box\s*\{\s*container-type:\s*inline-size/,
    );
    expect(FRAME_CSS).toMatch(
      /@container \(min-width: 19rem\)\s*\{\s*\.xp-frame \.xp-chips\[data-xp-chips="3"\]\s*\{\s*--xp-chip-columns: 3/,
    );
    expect(FRAME_CSS).toMatch(
      /@container \(min-width: 29\.5rem\)\s*\{\s*\.xp-frame \.xp-chips\[data-xp-chips="4"\]\s*\{\s*--xp-chip-columns: 4/,
    );
    // Default: two by two; a single chip takes the whole line.
    expect(FRAME_CSS).toMatch(/--xp-chip-columns: 2;/);
    expect(FRAME_CSS).toMatch(
      /\[data-xp-chips="1"\]\s*\{\s*--xp-chip-columns: 1/,
    );
    // The breathing card stands still with reduced motion.
    expect(FRAME_CSS.match(/\.xp-breathe,/g)).toHaveLength(2);
  });
});
