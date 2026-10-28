import { expect, type Frame, type Page } from "@playwright/test";
import type { GameType } from "./matrix";
import { AUTH_STORAGE_KEY, type Member } from "./backend";

// Every console error, uncaught exception and failed request of a page. Fonts and other
// third-party files never count: the suite checks the app, not the network around it.
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  const own = (url: string) =>
    url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1");
  page.on("pageerror", (error) => errors.push(`exception: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // A browser intervention, not an error of the page (vibrate before any tap).
    if (/navigator\.vibrate/.test(text)) return;
    // Reported again by the response listener, with its URL.
    if (/Failed to load resource/.test(text)) return;
    errors.push(`console: ${text}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && own(response.url()))
      errors.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    if (
      own(request.url()) &&
      !/ERR_ABORTED/.test(request.failure()?.errorText ?? "")
    )
      errors.push(`failed ${request.url()}: ${request.failure()?.errorText}`);
  });
  return errors;
}

// Signed in as the member, without going through the login form each time.
export async function signIn(page: Page, member: Member): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // a document without storage (about:blank)
      }
    },
    [AUTH_STORAGE_KEY, JSON.stringify(member.session)] as const,
  );
}

// The 8 slots of the frame and where the layout puts them, in the frame: their layout
// boxes, which an entrance animation (a slot rising in) never moves.
export async function slotBoxes(target: Page | Frame) {
  return target.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<HTMLElement>(".xp-frame > [data-xp-slot]")]
        .filter((slot) => slot.offsetHeight > 0)
        .map((slot) => [
          slot.dataset.xpSlot,
          [
            slot.offsetLeft,
            slot.offsetTop,
            slot.offsetWidth,
            slot.offsetHeight,
          ],
        ]),
    ),
  ) as Promise<Record<string, number[]>>;
}

export const screenOf = (target: Page | Frame) =>
  target.locator(".xp-frame").first().getAttribute("data-xp-screen");

// Plays the game on its play screen until the journey moves on, the way a player would:
// it never reads, guesses or sets the outcome, which comes from select-prize.
export async function playGame(page: Page, game: GameType): Promise<void> {
  const area = page.locator(`[data-xp-game="${game}"]`);
  await expect(area).toBeVisible();
  const cta = page.locator('.xp-frame [data-xp-cta="primary"]');
  // The game's phase, or null once the journey has moved past the play screen.
  const phase = () =>
    area.getAttribute("data-xp-phase", { timeout: 1000 }).catch(() => null);
  const startIfIdle = async () => {
    if ((await phase()) === "idle" && (await cta.isVisible()))
      await cta.click();
  };
  switch (game) {
    case "lucky_wheel":
      await cta.click();
      break;
    case "scratch_card": {
      await startIfIdle();
      const cover = page.locator("[data-xp-scratch-cover]");
      await expect(area).toHaveAttribute("data-xp-phase", "revealing");
      const box = (await cover.boundingBox())!;
      // Back and forth over the card until enough of it is gone.
      for (let row = 0; row < 8 && (await phase()) === "revealing"; row += 1) {
        const y = box.y + ((row + 0.5) / 8) * box.height;
        await page.mouse.move(box.x + 4, y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 4, y, { steps: 12 });
        await page.mouse.up();
        if ((await screenOf(page)) !== "play") break;
      }
      break;
    }
    case "mystery_box":
      await startIfIdle();
      await expect(area).toHaveAttribute("data-xp-phase", "interacting");
      await area.locator("button").first().click();
      break;
    case "quiz": {
      await startIfIdle();
      await expect(area).toHaveAttribute("data-xp-phase", "interacting");
      // Every question, the first answer each time, until the answers are sent.
      for (let asked = 0; asked < 20; asked += 1) {
        if ((await phase()) !== "interacting") break;
        const option = area.locator("[data-xp-quiz-option]:enabled").first();
        if (!(await option.isVisible())) break;
        await option.click({ timeout: 2000 }).catch(() => undefined);
        await page.waitForTimeout(150);
      }
      break;
    }
    case "hit_it": {
      await startIfIdle();
      await expect(area).toHaveAttribute("data-xp-phase", "interacting");
      const field = area.locator("button").first();
      // Taps on the target until the clock runs out.
      while ((await phase()) === "interacting") {
        const target = area.locator("[data-xp-hit-target]");
        const spot = await target
          .boundingBox({ timeout: 1000 })
          .catch(() => null);
        if (spot)
          await page.mouse.click(
            spot.x + spot.width / 2,
            spot.y + spot.height / 2,
          );
        else await field.click({ timeout: 1000 }).catch(() => undefined);
        await page.waitForTimeout(120);
      }
      break;
    }
  }
}

// From the welcome screen of /play/:slug to the play screen: the CTA, then the form with a
// phone number of its own and the consent box ticked.
export async function registerPlayer(page: Page, phone: string): Promise<void> {
  const cta = page.locator('.xp-frame [data-xp-cta="primary"]');
  await expect(
    page.locator('.xp-frame[data-xp-screen="welcome"]'),
  ).toBeVisible();
  await cta.click();
  await expect(
    page.locator('.xp-frame[data-xp-screen="register"]'),
  ).toBeVisible();
  await page.locator('input[autocomplete="name"]').fill("Joueur E2E");
  await page.locator('input[type="tel"]').fill(phone);
  const consent = page.locator('.xp-frame input[type="checkbox"]');
  // The native box is hidden under the drawn one: a player taps the drawing, in its label.
  for (const box of await consent.all()) {
    await box.locator("xpath=..").locator("span").first().click();
    await expect(box).toBeChecked();
  }
  await cta.click();
  await expect(page.locator('.xp-frame[data-xp-screen="play"]')).toBeVisible({
    timeout: 30_000,
  });
}

let phones = 0;
// An Algerian mobile number no other test of this run uses.
export function nextPhone(seed: string): string {
  phones += 1;
  const digits = (
    parseInt(seed.replace(/[^0-9a-f]/g, "").slice(0, 6), 16) +
    phones * 7919
  )
    .toString()
    .padStart(8, "0")
    .slice(-8);
  return `05${digits}`;
}
