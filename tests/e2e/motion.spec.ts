import { expect, test } from "@playwright/test";
import { CELLS, PLAY_FIXTURE } from "./support/matrix";
import { blocked, openFixture, running } from "./support/motion";
import { watchErrors } from "./support/page";

// The animations of every cell, on /xp-frame (no backend needed):
//   - they run: entrances, ambient loops, the screen's own feedback;
//   - they never take a tap: the game's area and the CTA answer at every point, from the
//     first frame of the entrance to the ambient loops, and no decoration lies over them;
//   - a template the app does not know falls back to the classic one, without an error.
// With reduced motion: motion-reduced.spec.ts. Played to the end with animations off and
// with reduced motion, on the real backend: matrix.spec.ts.

test.describe.configure({ mode: "parallel" });

for (const cell of CELLS) {
  test(`motion ${cell.template} × ${cell.game}`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const fixture of [
      PLAY_FIXTURE[cell.game],
      PLAY_FIXTURE[cell.game].replace("-play", "-welcome"),
    ]) {
      await openFixture(page, fixture, cell.template);
      // During the entrance, then once only the ambient loops are left.
      let elapsed = 0;
      for (const at of [50, 250, 600, 1500]) {
        await page.waitForTimeout(at - elapsed);
        elapsed = at;
        expect(await blocked(page), `${fixture} at ~${at} ms`).toEqual([]);
      }
      const now = await running(page);
      expect(now.all, `${fixture}: animations running`).toBeGreaterThan(0);
      if (cell.template !== "eight-slot")
        expect(now.loops, `${fixture}: ambient loops`).toBeGreaterThan(0);
      const issues = await page.evaluate(
        () => window.__xpLayoutAudit?.() ?? null,
      );
      expect(issues, `${fixture}: the audit runs`).not.toBeNull();
      expect(
        issues!.filter((issue) => issue.kind === "game-covered"),
        `${fixture}: no decoration over the game`,
      ).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test("a template the app does not know draws the classic one", async ({
  page,
}) => {
  const errors = watchErrors(page);
  for (const unknown of ["retired-template", "", "../comic-burst"]) {
    await openFixture(page, "wheel-play", encodeURIComponent(unknown));
    await expect(page.locator("[data-xp-themed]")).toHaveCount(0);
    await expect(page.locator('[data-xp-game="lucky_wheel"]')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
