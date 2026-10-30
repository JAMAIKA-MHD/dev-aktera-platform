import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Fixture, storedDesigns, type Member } from "./support/backend";
import { CELLS, VIEWPORTS } from "./support/matrix";
import {
  nextPhone,
  playGame,
  registerPlayer,
  signIn,
  slotBoxes,
  watchErrors,
} from "./support/page";
import {
  chooseTemplate,
  editPlayTitle,
  openStudio,
  playTitleValue,
  preview,
  primaryColorValue,
  setPrimaryColor,
  previewSize,
  saveEdits,
  showScreen,
} from "./support/studio";

// Every game in every template, end to end on the real local Supabase:
//   1. the Studio picks the template, edits the play screen (its title, the brand color),
//      saves — confirmed in campaign_experiences, one row, updated in place on a re-save —
//      and a hard reload gives back exactly what was saved;
//   2. /play/:slug, as a player: no console error, no failed request, the template and the
//      edit on the real play screen at the same place as in the Studio's preview, the game
//      played to its end, and the template's own win or lose screen, drawn by select-prize.

export const SHOTS = "test-results/e2e-shots";
mkdirSync(SHOTS, { recursive: true });

// Each cell in an organization of its own: an organization runs 5 active campaigns at most.
const fixture = new Fixture();

test.describe.configure({ mode: "parallel" });

test.afterAll(async () => {
  await fixture.cleanup();
});

for (const cell of CELLS) {
  test(`${cell.template} × ${cell.game}`, async ({ page, browser }) => {
    const errors = watchErrors(page);
    const org = await fixture.organization(cell.key);
    const member: Member = await fixture.member(org, cell.key);
    const campaign = await fixture.campaign(org, cell.game, cell.key, {
      winning: cell.winning,
    });
    const title = `E2E ${cell.key}`.slice(0, 40);
    const color = cell.winning ? "#1F5FBF" : "#0F6B3A";

    // ── 1. The Studio ────────────────────────────────────────────────────────────
    await signIn(page, member);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openStudio(page, campaign.id);
    await saveEdits(
      page,
      [title, color, `"templateId":"${cell.template}"`],
      async () => {
        await chooseTemplate(page, cell.template);
        await editPlayTitle(page, title);
        await setPrimaryColor(page, color);
      },
    );

    let rows = await storedDesigns(campaign.id);
    expect(rows, "one design row per campaign").toHaveLength(1);
    const first = rows[0];
    expect(first.template_id).toBe(cell.template);
    const saved = first.config as {
      schemaVersion: number;
      templateId: string;
      game: { type: string };
      theme: { colors: { primary: string } };
      screens: { play: { title: Record<string, string> } };
    };
    expect(saved.schemaVersion, "a versioned design").toBeGreaterThanOrEqual(1);
    expect(saved.templateId).toBe(cell.template);
    expect(saved.game.type).toBe(cell.game);
    expect(Object.values(saved.screens.play.title)).toContain(title);
    expect(saved.theme.colors.primary.toUpperCase()).toBe(color);

    // Saved again: the same row, updated in place.
    await saveEdits(page, [`${title}!`], () =>
      editPlayTitle(page, `${title}!`),
    );
    rows = await storedDesigns(campaign.id);
    expect(rows, "no duplicate after a second save").toHaveLength(1);
    expect(rows[0].updated_at).not.toBe(first.updated_at);
    await saveEdits(page, [`"${title}"`], () => editPlayTitle(page, title));

    // A hard reload gives back exactly what was saved.
    await page.reload();
    await openStudio(page, campaign.id);
    expect(await playTitleValue(page)).toBe(title);
    expect((await primaryColorValue(page)).toUpperCase()).toBe(color);
    await chooseTemplate(page, cell.template); // already the one: nothing changes
    expect(await storedDesigns(campaign.id)).toHaveLength(1);

    // The preview's play screen, at the phone's size: where every slot is drawn.
    await previewSize(page, VIEWPORTS.mobile);
    await showScreen(page, "play");
    const frame = preview(page);
    await expect(frame.locator(".xp-runtime").first()).toBeVisible();
    if (cell.template !== "eight-slot")
      await expect(frame.locator("[data-xp-themed]").first()).toHaveAttribute(
        "data-xp-themed",
        cell.template,
      );
    await expect(
      frame.locator('.xp-frame [data-xp-slot="title"]'),
    ).toContainText(title);
    const studioFrame = page
      .frames()
      .find((f) => f.url().includes("/xp-frame"))!;
    await page.waitForTimeout(400); // the preview settles its size (ResizeObserver)
    const inStudio = await slotBoxes(studioFrame);

    // ── 2. The player's page ─────────────────────────────────────────────────────
    // A player of its own, in French: the language the Studio edited.
    const players = await browser.newContext({ locale: "fr-DZ" });
    const player = await players.newPage();
    const playerErrors = watchErrors(player);
    // Which theme folders the player's page loads pictures, sounds and fonts from: its own
    // and the shared one. (The dev server also serves each theme's ?url import as a small
    // module, which is a URL string, not a file loaded: only real loads count.)
    const themeFolders = new Set<string>();
    player.on("request", (request) => {
      if (!["image", "media", "font"].includes(request.resourceType())) return;
      const folder = /\/player-experience\/themes\/([^/]+)\/assets\//.exec(
        request.url(),
      );
      if (folder) themeFolders.add(folder[1]);
    });
    await player.setViewportSize(VIEWPORTS.mobile);
    await player.goto(`/play/${campaign.slug}`);
    await expect(player.locator(".xp-runtime").first()).toBeVisible({
      timeout: 30_000,
    });
    if (cell.template !== "eight-slot")
      await expect(player.locator("[data-xp-themed]").first()).toHaveAttribute(
        "data-xp-themed",
        cell.template,
      );
    else await expect(player.locator("[data-xp-themed]")).toHaveCount(0);

    await registerPlayer(player, nextPhone(fixture.tag + cell.key));
    await expect(
      player.locator('.xp-frame [data-xp-slot="title"]'),
    ).toContainText(title);
    await player.waitForTimeout(400);

    // Parity: the very slots, at the very places, as in the Studio's preview.
    const onPage = await slotBoxes(player);
    for (const [slot, box] of Object.entries(inStudio)) {
      if (slot === "header") continue; // the preview's DEMO chip is the Studio's own
      expect(onPage[slot], `slot ${slot}`).toBeDefined();
      onPage[slot]!.forEach((value: number, index: number) =>
        expect(
          Math.abs(value - box[index]),
          `slot ${slot} [x, y, w, h][${index}]: page ${JSON.stringify(onPage)} vs studio ${JSON.stringify(inStudio)}`,
        ).toBeLessThanOrEqual(2),
      );
    }

    await player.screenshot({ path: `${SHOTS}/${cell.key}__play__mobile.png` });
    await player.setViewportSize(VIEWPORTS.desktop);
    await player.waitForTimeout(500);
    await player.screenshot({
      path: `${SHOTS}/${cell.key}__play__desktop.png`,
    });
    await player.setViewportSize(VIEWPORTS.mobile);

    // Played to its end; the outcome is select-prize's.
    await playGame(player, cell.game);
    const result = cell.winning ? "win" : "lose";
    await expect(
      player.locator(`.xp-frame[data-xp-screen="${result}"]`),
    ).toBeVisible({
      timeout: 30_000,
    });
    if (cell.template !== "eight-slot")
      await expect(player.locator("[data-xp-themed]").first()).toHaveAttribute(
        "data-xp-themed",
        cell.template,
      );
    await player.waitForTimeout(800);
    await player.screenshot({
      path: `${SHOTS}/${cell.key}__${result}__mobile.png`,
    });

    await players.close();

    // ── 3. Played again, still: with prefers-reduced-motion, then the brand's animations
    // off (features.animations, no field of the Studio yet: written as a member would). ──
    for (const still of ["reduced-motion", "animations-off"] as const) {
      if (still === "animations-off") {
        const [row] = await storedDesigns(campaign.id);
        const config = row.config as { features: Record<string, unknown> };
        const { error } = await member.client
          .from("campaign_experiences")
          .update({
            config: {
              ...config,
              features: { ...config.features, animations: false },
            },
          })
          .eq("campaign_id", campaign.id);
        expect(error).toBeNull();
      }
      const context = await browser.newContext({
        locale: "fr-DZ",
        reducedMotion: still === "reduced-motion" ? "reduce" : "no-preference",
      });
      const again = await context.newPage();
      const againErrors = watchErrors(again);
      await again.setViewportSize(VIEWPORTS.mobile);
      await again.goto(`/play/${campaign.slug}`);
      await registerPlayer(again, nextPhone(fixture.tag + cell.key + still));
      if (still === "animations-off")
        await expect(
          again.locator('.xp-frame[data-xp-motion="off"]'),
        ).toBeVisible();
      await playGame(again, cell.game);
      await expect(
        again.locator(`.xp-frame[data-xp-screen="${result}"]`),
      ).toBeVisible({ timeout: 30_000 });
      await context.close();
      expect(againErrors, `${still}: errors`).toEqual([]);
    }

    const allowed = new Set([cell.template, "_shared"]);
    expect(
      [...themeFolders].filter((folder) => !allowed.has(folder)),
      "files of another template fetched by the player's page",
    ).toEqual([]);
    expect(errors, "Studio: console errors and failed requests").toEqual([]);
    expect(playerErrors, "player: console errors and failed requests").toEqual(
      [],
    );
  });
}
