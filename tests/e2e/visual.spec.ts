import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { CELLS, GAMES, PLAY_FIXTURE, TEMPLATES } from "./support/matrix";
import { watchErrors } from "./support/page";

// The play screen of every cell at every kind of size, checked by the runtime's own layout
// audit (the one the Studio and npm run xp:responsive use): nothing cut, nothing sideways,
// no slot over another, the game at its floor and no decoration over it (game-covered).
// Screenshots of each go to a contact sheet. (Every other screen, still: stills.spec.ts.)

const OUT = "test-results/e2e-visual";
mkdirSync(OUT, { recursive: true });

const SIZES = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "mobile", width: 390, height: 844 },
  { name: "landscape", width: 844, height: 390 },
  { name: "small", width: 360, height: 640 },
  { name: "narrow", width: 280, height: 653 },
  { name: "wide", width: 1920, height: 1080 },
] as const;

test.describe.configure({ mode: "parallel" });

async function openFixture(page: Page, fixture: string, template: string) {
  await page.goto(`/xp-frame?fixture=${fixture}&template=${template}`);
  await expect(page.locator(".xp-frame").first()).toBeVisible({
    timeout: 30_000,
  });
  await page.evaluate(() => document.fonts.ready);
}

for (const cell of CELLS) {
  test(`layout ${cell.template} × ${cell.game}`, async ({ page }) => {
    const errors = watchErrors(page);
    const fixture = PLAY_FIXTURE[cell.game];
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await openFixture(page, fixture, cell.template);
      await expect(page.locator(`[data-xp-game="${cell.game}"]`)).toBeVisible();
      await page.waitForTimeout(700); // entrance animations
      const issues = await page.evaluate(
        () => window.__xpLayoutAudit?.() ?? null,
      );
      expect(issues, `${size.name}: the audit runs`).not.toBeNull();
      expect(issues, `${cell.key} at ${size.width}×${size.height}`).toEqual([]);
      if (size.name === "desktop" || size.name === "mobile")
        await page.screenshot({ path: `${OUT}/${cell.key}__${size.name}.png` });
    }
    expect(errors).toEqual([]);
  });
}

// ── Contact sheets: templates across, games down ────────────────────────────────

test.describe("sheets", () => {
  test.describe.configure({ mode: "serial" });
  test("contact sheet of every play screen", async ({ page }) => {
    for (const size of ["desktop", "mobile"] as const) {
      const missing = CELLS.filter(
        (cell) => !existsSync(`${OUT}/${cell.key}__${size}.png`),
      );
      test.skip(missing.length > 0, "run the layout tests first");
      const width = size === "desktop" ? 320 : 150;
      const img = (key: string) =>
        `<img width="${width}" src="${pathToFileURL(resolve(OUT, `${key}__${size}.png`)).href}">`;
      const rows = GAMES.map(
        (game) =>
          `<tr><th>${game}</th>${TEMPLATES.map(
            (template) =>
              `<td>${img(CELLS.find((c) => c.game === game && c.template === template)!.key)}</td>`,
          ).join("")}</tr>`,
      ).join("");
      const html = `<html><body style="margin:0;background:#222;color:#eee;font:12px sans-serif"><table cellspacing="4"><tr><th></th>${TEMPLATES.map((t) => `<th>${t}</th>`).join("")}</tr>${rows}</table></body></html>`;
      const file = resolve(OUT, `sheet-${size}.html`);
      writeFileSync(file, html);
      await page.setViewportSize({
        width: 140 + TEMPLATES.length * (width + 8),
        height: 400,
      });
      await page.goto(pathToFileURL(file).href);
      await page.waitForLoadState("load");
      await page.screenshot({
        path: `${OUT}/contact-sheet-${size}.png`,
        fullPage: true,
      });
    }
  });
});
