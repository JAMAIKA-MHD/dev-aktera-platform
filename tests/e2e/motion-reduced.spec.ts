import { expect, test } from "@playwright/test";
import { PLAY_FIXTURE, TEMPLATES } from "./support/matrix";
import { blocked, openFixture, running } from "./support/motion";
import { watchErrors } from "./support/page";

// prefers-reduced-motion, in every template: no loop runs, nothing stays mid-entrance over
// the game or the CTA, and every screen still draws. The browser itself is in reduced
// motion, as the system setting makes it: the emulated media feature alone does not reach
// the SVG pictures, whose own animations would keep running.

test.describe.configure({ mode: "parallel" });
test.use({
  reducedMotion: "reduce",
  launchOptions: { args: ["--force-prefers-reduced-motion"] },
});

for (const template of TEMPLATES) {
  test(`no loop runs: ${template}`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const fixture of [
      ...Object.values(PLAY_FIXTURE),
      "flow-welcome",
      "register",
      "flow-win",
      "flow-lose",
    ]) {
      await openFixture(page, fixture, template);
      await page.waitForTimeout(1200);
      expect((await running(page)).loops, fixture).toBe(0);
      expect(await blocked(page), fixture).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}
