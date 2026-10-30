import { expect, type Page } from "@playwright/test";

// A fixture of /xp-frame, in a template.
export async function openFixture(
  page: Page,
  fixture: string,
  template: string,
) {
  await page.goto(`/xp-frame?fixture=${fixture}&template=${template}`);
  await expect(page.locator(".xp-frame").first()).toBeVisible({
    timeout: 30_000,
  });
}

// The animations of the document running now: all of them, and the endless ones (loops).
export const running = (page: Page) =>
  page.evaluate(() => {
    const all = document
      .getAnimations()
      .filter((animation) => animation.playState === "running");
    const loops = all.filter(
      (animation) =>
        animation.effect?.getComputedTiming().iterations === Infinity,
    );
    return { all: all.length, loops: loops.length };
  });

// Every point of a 5 × 5 grid over the game's area, and the CTA's centre, must reach the
// game or the CTA: nothing drawn over them takes the tap. Returns the points that do not.
export const blocked = (page: Page) =>
  page.evaluate(() => {
    const misses: string[] = [];
    const describe = (element: Element | null) =>
      element
        ? `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}`
        : "nothing";
    const game = document.querySelector("[data-xp-game]");
    if (game) {
      const box = game.getBoundingClientRect();
      for (let i = 1; i <= 5; i += 1)
        for (let j = 1; j <= 5; j += 1) {
          const x = box.left + (box.width * i) / 6;
          const y = box.top + (box.height * j) / 6;
          if (x >= innerWidth || y >= innerHeight) continue;
          const hit = document.elementFromPoint(x, y);
          if (!hit || !game.contains(hit))
            misses.push(`game (${i},${j}) → ${describe(hit)}`);
        }
    }
    const cta = document.querySelector('.xp-frame [data-xp-cta="primary"]');
    if (cta && (cta as HTMLElement).offsetParent) {
      const box = cta.getBoundingClientRect();
      if (box.bottom <= innerHeight) {
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        if (!hit || !cta.contains(hit)) misses.push(`cta → ${describe(hit)}`);
      }
    }
    return misses;
  });
