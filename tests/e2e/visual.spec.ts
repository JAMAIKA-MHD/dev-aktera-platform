import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { CELLS, GAMES, PLAY_FIXTURE, TEMPLATES } from "./support/matrix";
import { watchErrors } from "./support/page";

// The play screen of every cell at every kind of size, checked by the runtime's own layout
// audit (the one the Studio and npm run xp:responsive use): nothing cut, nothing sideways,
// no slot over another, the game at its floor and no decoration over it (game-covered).
// Screenshots of each go to a contact sheet. Then every screen of every template is
// compared with the baseline taken before this work (.baseline/, when present).

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

declare global {
  interface Window {
    __xpLayoutAudit?: () => unknown[];
  }
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

// ── Nothing else changed: every other screen against the baseline ──────────────

const OTHER_SCREENS = [
  "flow-welcome",
  "register",
  "resolving",
  "status-duplicate",
  "status-closed",
  "status-error",
  "wheel-welcome",
  "scratch-welcome",
  "boxes-welcome",
  "quiz-welcome",
  "hit-it-welcome",
  "flow-win",
  "flow-lose",
  "wheel-play",
] as const;
const BASELINE = ".baseline";
const BASELINE_SIZES = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

// Share of pixels that differ between two screenshots, in the browser (no image library).
async function diffRatio(page: Page, a: string, b: string): Promise<number> {
  const data = (path: string) =>
    `data:image/png;base64,${readFileSync(path).toString("base64")}`;
  return page.evaluate(
    async ([first, second]) => {
      const load = (src: string) =>
        new Promise<HTMLImageElement>((done) => {
          const image = new Image();
          image.onload = () => done(image);
          image.src = src;
        });
      const [x, y] = await Promise.all([load(first), load(second)]);
      if (x.width !== y.width || x.height !== y.height) return 1;
      const pixels = (image: HTMLImageElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height).data;
      };
      const p = pixels(x);
      const q = pixels(y);
      let changed = 0;
      for (let i = 0; i < p.length; i += 4) {
        const delta =
          Math.abs(p[i] - q[i]) +
          Math.abs(p[i + 1] - q[i + 1]) +
          Math.abs(p[i + 2] - q[i + 2]);
        if (delta > 48) changed += 1;
      }
      return changed / (p.length / 4);
    },
    [data(a), data(b)] as const,
  );
}

test.describe("baseline", () => {
  test.skip(!existsSync(BASELINE), "no baseline (.baseline/) on this machine");
  for (const template of TEMPLATES) {
    test(`other screens unchanged: ${template}`, async ({ page, browser }) => {
      const scratch = await browser.newPage();
      const report: Record<string, number> = {};
      for (const fixture of OTHER_SCREENS) {
        for (const size of BASELINE_SIZES) {
          const name = `${template}__${fixture}__${size.width}x${size.height}.png`;
          const before = `${BASELINE}/${name}`;
          if (!existsSync(before)) continue;
          await page.setViewportSize(size);
          await openFixture(page, fixture, template);
          await page.waitForTimeout(1200); // as the baseline was taken
          const now = `${OUT}/now__${name}`;
          await page.screenshot({ path: now });
          report[name] = await diffRatio(scratch, before, now);
        }
      }
      writeFileSync(
        `${OUT}/baseline-${template}.json`,
        JSON.stringify(report, null, 1),
      );
      const changed = Object.entries(report).filter(
        ([, ratio]) => ratio > 0.01,
      );
      expect(
        changed,
        "screens more than 1% different from the baseline",
      ).toEqual([]);
      await scratch.close();
    });
  }
});
