import { expect, test } from "@playwright/test";
import {
  admin,
  anonClient,
  Fixture,
  storedDesigns,
  type Campaign,
  type Member,
} from "./support/backend";
import { signIn, watchErrors } from "./support/page";
import { chooseTemplate, openStudio, saveEdits } from "./support/studio";

// Who may read and write a saved design, and what an older design does today:
//   - a member of another organization can neither read nor overwrite it (RLS, and
//     save_experience_config finding no campaign), an anonymous visitor neither;
//   - a save from a stale copy is refused (CONFLICT), never silently written over;
//   - a design saved before versioning (v0), and the designs already in the database,
//     still load in the Studio without being rewritten, and render on /play/:slug.

const fixture = new Fixture();
let memberA: Member;
let memberB: Member;
let campaign: Campaign;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const orgA = await fixture.organization("owner");
  const orgB = await fixture.organization("other");
  memberA = await fixture.member(orgA, "owner");
  memberB = await fixture.member(orgB, "other");
  campaign = await fixture.campaign(orgA, "lucky_wheel", "access");
});
test.afterAll(async () => {
  await fixture.cleanup();
});

test("the owner saves a design through the Studio", async ({ page }) => {
  const summary = (rows: Awaited<ReturnType<typeof storedDesigns>>) =>
    rows.map((row) => {
      const config = row.config as Record<string, unknown> & {
        game?: { type?: string };
        theme?: { colors?: { primary?: string } };
      };
      return {
        campaign_id: row.campaign_id,
        template_id: row.template_id,
        updated_at: row.updated_at,
        "config.schemaVersion": config.schemaVersion,
        "config.templateId": config.templateId,
        "config.game.type": config.game?.type,
        "config.theme.colors.primary": config.theme?.colors?.primary,
      };
    });
  console.log(
    "BEFORE",
    JSON.stringify(summary(await storedDesigns(campaign.id))),
  );
  await signIn(page, memberA);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page, campaign.id);
  await saveEdits(page, ['"templateId":"arcade-night"'], () =>
    chooseTemplate(page, "arcade-night"),
  );
  const rows = await storedDesigns(campaign.id);
  console.log("AFTER ", JSON.stringify(summary(rows), null, 1));
  expect(rows).toHaveLength(1);
  expect(rows[0].template_id).toBe("arcade-night");
});

test("another organization can neither read nor overwrite it", async () => {
  const [before] = await storedDesigns(campaign.id);
  const other = memberB.client;

  const read = await other
    .from("campaign_experiences")
    .select("*")
    .eq("campaign_id", campaign.id);
  expect(read.error).toBeNull();
  expect(read.data, "no row visible to another organization").toEqual([]);

  const hijacked = { ...before.config, templateId: "quiz-show" };
  const saved = await other.rpc("save_experience_config", {
    p_campaign_id: campaign.id,
    p_config: hijacked,
    p_expected_updated_at: null,
  });
  expect(saved.error).toBeNull();
  expect(saved.data).toEqual({ ok: false, code: "NOT_FOUND" });

  const updated = await other
    .from("campaign_experiences")
    .update({ config: hijacked })
    .eq("campaign_id", campaign.id)
    .select();
  expect(updated.data ?? [], "no row updated by another organization").toEqual(
    [],
  );

  const deleted = await other
    .from("campaign_experiences")
    .delete()
    .eq("campaign_id", campaign.id)
    .select();
  expect(deleted.data ?? []).toEqual([]);

  const [after] = await storedDesigns(campaign.id);
  expect(after.updated_at).toBe(before.updated_at);
  expect(after.template_id).toBe("arcade-night");
});

test("an anonymous visitor can neither read nor write it", async () => {
  const anon = anonClient();
  const read = await anon
    .from("campaign_experiences")
    .select("*")
    .eq("campaign_id", campaign.id);
  expect(read.data ?? []).toEqual([]);
  const [before] = await storedDesigns(campaign.id);
  const saved = await anon.rpc("save_experience_config", {
    p_campaign_id: campaign.id,
    p_config: before.config,
    p_expected_updated_at: null,
  });
  expect(
    saved.error,
    "save_experience_config is not granted to anon",
  ).not.toBeNull();
  // The public page reads only the safe copy, through get_public_experience.
  const publicRead = await anon.rpc("get_public_experience", {
    p_slug: campaign.slug,
  });
  expect(publicRead.error).toBeNull();
  const [after] = await storedDesigns(campaign.id);
  expect(after.updated_at).toBe(before.updated_at);
});

test("a save from a stale copy is refused, not written over", async () => {
  const [current] = await storedDesigns(campaign.id);
  const stale = await memberA.client.rpc("save_experience_config", {
    p_campaign_id: campaign.id,
    p_config: { ...current.config, templateId: "pixel-quest" },
    p_expected_updated_at: "2000-01-01T00:00:00.000Z",
  });
  expect(stale.data).toEqual({ ok: false, code: "CONFLICT" });
  const [after] = await storedDesigns(campaign.id);
  expect(after.template_id).toBe("arcade-night");
});

test("a design saved before versioning still loads, unchanged, and plays", async ({
  page,
  browser,
}) => {
  // The very design of the owner, as saved before schemaVersion existed (v0).
  const [current] = await storedDesigns(campaign.id);
  const { schemaVersion: _version, ...v0 } = current.config;
  const legacy = { ...v0, templateId: "comic-burst" };
  const { error } = await admin
    .from("campaign_experiences")
    .update({ config: legacy })
    .eq("campaign_id", campaign.id);
  expect(error).toBeNull();
  const [stored] = await storedDesigns(campaign.id);

  const errors = watchErrors(page);
  await signIn(page, memberA);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page, campaign.id);
  await expect(
    page.getByRole("radio", { name: /^Cartoon Pop/ }),
  ).toHaveAttribute("aria-checked", "true");
  await page.waitForTimeout(2500); // more than the autosave's delay
  const [afterStudio] = await storedDesigns(campaign.id);
  expect(afterStudio.updated_at, "opening the Studio writes nothing").toBe(
    stored.updated_at,
  );

  const players = await browser.newContext({ locale: "fr-DZ" });
  const player = await players.newPage();
  const playerErrors = watchErrors(player);
  await player.goto(`/play/${campaign.slug}`);
  await expect(player.locator("[data-xp-themed]").first()).toHaveAttribute(
    "data-xp-themed",
    "comic-burst",
  );
  await expect(
    player.locator('.xp-frame[data-xp-screen="welcome"]'),
  ).toBeVisible();
  await players.close();
  expect(errors).toEqual([]);
  expect(playerErrors).toEqual([]);
});

test("the designs saved before this work still render on their public page", async ({
  browser,
}) => {
  const { data } = await admin
    .from("campaign_experiences")
    .select(
      "template_id, updated_at, campaigns!inner(slug, status, end_date, organizations!inner(name))",
    )
    .not("campaigns.organizations.name", "like", "e2e %");
  const live = (data ?? []).filter((row) => {
    const c = row.campaigns as unknown as { status: string; end_date: string };
    return c.status === "active" && new Date(c.end_date) > new Date();
  });
  test.skip(live.length === 0, "no live design from before in this database");
  for (const row of live) {
    const { slug } = row.campaigns as unknown as { slug: string };
    const players = await browser.newContext({ locale: "fr-DZ" });
    const player = await players.newPage();
    const errors = watchErrors(player);
    await player.goto(`/play/${slug}`);
    await expect(player.locator(".xp-frame").first()).toBeVisible({
      timeout: 30_000,
    });
    if (row.template_id !== "eight-slot")
      await expect(player.locator("[data-xp-themed]").first()).toHaveAttribute(
        "data-xp-themed",
        row.template_id,
      );
    await player.screenshot({
      path: `test-results/e2e-shots/older__${slug}.png`,
    });
    await players.close();
    expect(errors, slug).toEqual([]);
    const { data: again } = await admin
      .from("campaign_experiences")
      .select("updated_at, campaigns!inner(slug)")
      .eq("campaigns.slug", slug)
      .single();
    expect(again?.updated_at, `${slug} untouched`).toBe(row.updated_at);
  }
});
