import { expect, test, type Frame, type Page } from "@playwright/test";
import { admin, Fixture, storedDesigns } from "./support/backend";
import { CELLS, PLAY_FIXTURE } from "./support/matrix";
import { signIn, watchErrors } from "./support/page";
import {
  chooseTemplate,
  editPlayTitle,
  openStudio,
  playTitleValue,
  preview,
  previewSize,
  saveEdits,
  showScreen,
} from "./support/studio";

// The Studio of every cell, on the real local Supabase:
//   - its preview draws the cell's play screen in the template's own look: the same stage
//     pictures, decorations, title font and entrance as the template's reference page;
//   - every kind of edit the Studio offers reaches the preview and the database: a text,
//     show/hide (the header), the teaser's motion (animated or still), undo and redo;
//   - all of it comes back after a hard reload, in one row;
//   - a save the database refuses (a stale copy) is said, "Not saved", never swallowed.
// The Studio has no free layout (rule: templates never move a slot), so there is nothing
// to drag, resize or put on another layer.

const fixture = new Fixture();
test.describe.configure({ mode: "parallel" });
test.afterAll(async () => {
  await fixture.cleanup();
});

// What makes the look of a template, read in a document: file names only (no hash, no
// brand color), so the Studio's preview and the reference page can be compared.
async function look(target: Page | Frame) {
  return target.evaluate(() => {
    const file = (url: string) =>
      /([^/]+?)(?:-[A-Za-z0-9_-]{8})?\.(svg|png|webp|avif|jpe?g)/.exec(
        url,
      )?.[1];
    const urls = (value: string) =>
      [...value.matchAll(/url\("?([^")]+)"?\)/g)]
        .map((match) => file(match[1]))
        .filter(Boolean);
    const root = document.querySelector(".xp-root");
    const stage = document.querySelector(".xp-stage-image");
    const title = document.querySelector('.xp-frame [data-xp-slot="title"]');
    return {
      themed:
        document
          .querySelector("[data-xp-themed]")
          ?.getAttribute("data-xp-themed") ?? null,
      entrance: root?.getAttribute("data-xp-fx-entrance") ?? null,
      stage: stage ? urls(getComputedStyle(stage).backgroundImage) : [],
      decor: [...document.querySelectorAll(".xp-stage .xp-decor")]
        .map((decor) =>
          file(
            (decor as HTMLImageElement).currentSrc ||
              getComputedStyle(decor).backgroundImage,
          ),
        )
        .sort(),
      titleFont: title
        ? getComputedStyle(title.querySelector("h1, h2, p, span") ?? title)
            .fontFamily
        : null,
    };
  });
}

const studioFrame = (page: Page) =>
  page.frames().find((frame) => frame.url().includes("/xp-frame"))!;

for (const cell of CELLS) {
  test(`editor ${cell.template} × ${cell.game}`, async ({ page, browser }) => {
    const errors = watchErrors(page);
    const org = await fixture.organization(`ed-${cell.key}`);
    const member = await fixture.member(org, `ed-${cell.key}`);
    const campaign = await fixture.campaign(org, cell.game, `ed-${cell.key}`);

    await signIn(page, member);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStudio(page, campaign.id);
    await saveEdits(page, [`"templateId":"${cell.template}"`], () =>
      chooseTemplate(page, cell.template),
    );

    // ── The cell's look, as on the template's reference page ──────────────────────
    await previewSize(page, { width: 390, height: 844 });
    await showScreen(page, "play");
    await expect(
      preview(page).locator(`[data-xp-game="${cell.game}"]`),
    ).toBeVisible();
    await page.waitForTimeout(600);
    const inStudio = await look(studioFrame(page));
    const reference = await browser.newPage();
    await reference.setViewportSize({ width: 390, height: 844 });
    await reference.goto(
      `/xp-frame?fixture=${PLAY_FIXTURE[cell.game]}&template=${cell.template}`,
    );
    await expect(reference.locator(".xp-frame").first()).toBeVisible();
    await reference.waitForTimeout(600);
    expect(inStudio, "the preview's look").toEqual(await look(reference));
    await reference.close();
    if (cell.template !== "eight-slot")
      expect(inStudio.themed).toBe(cell.template);

    // ── Edits: text, show/hide, the teaser's motion ─────────────────────────────────
    const title = `Ed ${cell.key}`.slice(0, 40);
    await saveEdits(page, [title], () => editPlayTitle(page, title));
    await expect(
      preview(page).locator('.xp-frame [data-xp-slot="title"]'),
    ).toContainText(title);

    const header = page.getByRole("switch", { name: /^Show header/ });
    await expect(header).toBeChecked();
    await saveEdits(page, ['"showHeader":false'], () => header.click());
    await expect(
      preview(page).locator('.xp-frame [data-xp-slot="header"]'),
    ).toHaveCount(0);

    await page.getByLabel("Screen to edit").selectOption("welcome");
    const motion = page.getByRole("radiogroup", { name: "Motion" });
    const still = motion.getByRole("radio", { name: "Still" });
    await saveEdits(page, ['"mode":"static"'], () => still.click());
    await expect(still).toBeChecked();

    // ── Undo and redo, through the top bar ──────────────────────────────────────────
    await saveEdits(page, ['"mode":"attract"'], () =>
      page.getByRole("button", { name: /^Undo/ }).click(),
    );
    await expect(motion.getByRole("radio", { name: "Animated" })).toBeChecked();
    await saveEdits(page, ['"mode":"static"'], () =>
      page.getByRole("button", { name: /^Redo/ }).click(),
    );
    await expect(still).toBeChecked();

    // ── In the database, then after a hard reload: everything, in one row ─────────
    const rows = await storedDesigns(campaign.id);
    expect(rows).toHaveLength(1);
    const saved = rows[0].config as {
      templateId: string;
      game: { teaser: { mode: string } };
      screens: {
        play: { title: Record<string, string>; showHeader: boolean };
      };
    };
    expect(saved.templateId).toBe(cell.template);
    expect(Object.values(saved.screens.play.title)).toContain(title);
    expect(saved.screens.play.showHeader).toBe(false);
    expect(saved.game.teaser.mode).toBe("static");

    await page.reload();
    await openStudio(page, campaign.id);
    expect(await playTitleValue(page)).toBe(title);
    await expect(
      page.getByRole("switch", { name: /^Show header/ }),
    ).not.toBeChecked();
    await page.getByLabel("Screen to edit").selectOption("welcome");
    await expect(
      page
        .getByRole("radiogroup", { name: "Motion" })
        .getByRole("radio", { name: "Still" }),
    ).toBeChecked();
    await page.waitForTimeout(2500); // more than the autosave's delay
    const [reloaded] = await storedDesigns(campaign.id);
    expect(reloaded.updated_at, "opening the Studio writes nothing").toBe(
      rows[0].updated_at,
    );

    // ── A save the database refuses is said, not swallowed ─────────────────────────
    // Another tab saved meanwhile: this copy is stale, and save_experience_config refuses it.
    const { error } = await admin
      .from("campaign_experiences")
      .update({ updated_at: new Date().toISOString() })
      .eq("campaign_id", campaign.id);
    expect(error).toBeNull();
    await page.getByLabel("Screen to edit").selectOption("play");
    await page.getByLabel("Title", { exact: true }).fill(`${title}?`);
    await expect(
      page.getByRole("alert").filter({ hasText: "Retry" }),
    ).toBeVisible({
      timeout: 20_000,
    });
    const [after] = await storedDesigns(campaign.id);
    expect(
      Object.values((after.config as typeof saved).screens.play.title),
      "the refused copy was not written",
    ).toContain(title);

    expect(
      errors.filter((line) => !/save_experience_config|CONFLICT/.test(line)),
    ).toEqual([]);
  });
}
