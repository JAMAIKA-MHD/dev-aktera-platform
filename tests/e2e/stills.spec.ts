import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { TEMPLATES } from "./support/matrix";
import { watchErrors } from "./support/page";
import { diffPixels, type PixelDiff } from "./support/pixels";

// Every screen of every template, still (prefers-reduced-motion, CSS animations finished),
// so two runs of the same code give the same pixels. XP_STILLS=capture takes the reference
// into XP_STILLS_DIR; any other run compares with it, pixel by pixel. Use it around a change
// that must not move a pixel (an asset moved or converted, a refactor).

const MODE = process.env.XP_STILLS === "capture" ? "capture" : "compare";
const REFERENCE = process.env.XP_STILLS_DIR ?? ".baseline-pre-cleanup/stills";
const OUT = "test-results/e2e-stills";
// What two captures of the same code differ by (XP_STILLS_NOISE, written after a capture
// by comparing a second one with it): only the shots listed there are allowed to differ.
const NOISE_FILE =
  process.env.XP_STILLS_NOISE ?? ".baseline-pre-cleanup/stills-noise.json";
const NOISE: Record<string, PixelDiff> = existsSync(NOISE_FILE)
  ? JSON.parse(readFileSync(NOISE_FILE, "utf8"))
  : {};

// Every fixture of /xp-frame that draws a screen (the debug views are not screens).
const DEBUG_VIEWS = [
  "layout-debug",
  "theme-presets",
  "all-games",
  "feedback-debug",
];
const SCREENS = [
  ...readFileSync(
    resolve(
      process.cwd(),
      "src/features/player-experience/runtime/host/fixtures.ts",
    ),
    "utf8",
  ).matchAll(/^ {2}"?([a-z0-9-]+)"?: fixture\(/gm),
]
  .map((match) => match[1])
  .filter((name) => !DEBUG_VIEWS.includes(name));

const SIZES = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
] as const;

test.describe.configure({ mode: "parallel" });
// The browser itself in reduced motion, as the system setting does: the emulated media
// feature alone does not reach the SVG pictures, whose own animations would keep running.
test.use({
  reducedMotion: "reduce",
  launchOptions: { args: ["--force-prefers-reduced-motion"] },
});

test("every fixture is read", () => {
  expect(SCREENS.length).toBeGreaterThan(10);
});

for (const template of TEMPLATES) {
  for (const screen of SCREENS) {
    test(`still ${template} ${screen}`, async ({ page, browser }) => {
      const dir = MODE === "capture" ? REFERENCE : OUT;
      mkdirSync(dir, { recursive: true });
      const errors = watchErrors(page);
      const report: Record<string, PixelDiff | "missing"> = {};
      for (const size of SIZES) {
        const name = `${template}__${screen}__${size.width}x${size.height}.png`;
        await page.setViewportSize(size);
        await page.goto(`/xp-frame?fixture=${screen}&template=${template}`);
        await expect(page.locator(".xp-frame").first()).toBeVisible({
          timeout: 30_000,
        });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500); // ResizeObserver settles, pictures decode
        // Still means two shots in a row are the same (a timed journey has moved on).
        const shot = () =>
          page.screenshot({ animations: "disabled", caret: "hide" });
        let last = await shot();
        for (let tries = 0; tries < 20; tries += 1) {
          await page.waitForTimeout(250);
          const next = await shot();
          if (next.equals(last)) break;
          last = next;
        }
        writeFileSync(`${dir}/${name}`, last);
        if (MODE === "compare") {
          const before = `${REFERENCE}/${name}`;
          const scratch = await browser.newPage();
          report[name] = existsSync(before)
            ? await diffPixels(scratch, before, `${dir}/${name}`)
            : "missing";
          await scratch.close();
        }
      }
      // That fixture is the refusal itself, which the runtime reports on the console.
      const expected = (error: string) =>
        screen === "flow-gateway-refused" &&
        /"demo" participation gateway is not allowed here/.test(error);
      expect(
        errors.filter((error) => !expected(error)),
        "console errors and failed requests",
      ).toEqual([]);
      if (MODE === "capture") return;
      writeFileSync(
        `${OUT}/${template}__${screen}.json`,
        JSON.stringify(report, null, 1),
      );
      // A shot whose text glows is not drawn twice the same (GPU rasterization): its noise,
      // measured between two captures of the same code, is allowed twice; others match exactly.
      const changed = Object.entries(report).filter(([name, diff]) => {
        if (diff === "missing" || !diff.size) return true;
        const floor = NOISE[name];
        return floor ? diff.visible > floor.visible * 2 + 1e-5 : diff.exact > 0;
      });
      expect(changed, "sizes that differ from the reference").toEqual([]);
    });
  }
}
