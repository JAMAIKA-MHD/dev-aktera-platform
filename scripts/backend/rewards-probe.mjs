#!/usr/bin/env node
// Probe of the Reward Library rules on the local Supabase stack (reward library task T1.7).
//
//   npm run backend:rewards
//
// Checks, on throwaway data it creates and deletes:
//   - a code that expired is never handed to a winner, a valid one is;
//   - two winners at the same time never get the same code;
//   - a reward whose codes are all used or expired is never drawn (both draw modes);
//   - a reward with no code at all can still be drawn (the "You Won!" without reward case);
//   - the delivery status RPC: a member can set it, a viewer, another organization, a losing
//     entry, a digital reward, a bad status and anon cannot.
// Local stack only: it refuses to run against any other URL. Exit code 1 on any failure.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = (process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const LOCAL_URLS = ["http://127.0.0.1:54321", "http://localhost:54321"];

if (!LOCAL_URLS.includes(url)) {
  console.error(`Refusing to run: VITE_SUPABASE_URL is "${url}", not the local stack.`);
  process.exit(2);
}
if (!anonKey || !serviceKey) {
  console.error("Missing VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(2);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, options);
const anon = createClient(url, anonKey, options);

const tag = randomUUID().slice(0, 8);
const PASSWORD = "Probe-pass-12345";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name.padEnd(70)} ${detail}`);
};
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

const created = { orgIds: [], userIds: [] };

async function makeOrg(label) {
  const org = must(
    await admin
      .from("organizations")
      .insert({ name: `probe-${label}-${tag}`, slug: `probe-${label}-${tag}`, contact_email: `${label}-${tag}@probe.test` })
      .select("id")
      .single(),
    "organization",
  );
  created.orgIds.push(org.id);
  return org.id;
}

async function makeMember(orgId, label, role) {
  const email = `${label}-${tag}@probe.test`;
  const user = must(
    await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true }),
    "user",
  ).user;
  created.userIds.push(user.id);
  must(
    await admin
      .from("profiles")
      .insert({ id: user.id, organization_id: orgId, full_name: label, email, role }),
    "profile",
  );
  const client = createClient(url, anonKey, options);
  must(await client.auth.signInWithPassword({ email, password: PASSWORD }), "sign in");
  return client;
}

const makeTemplate = async (orgId, name, category = "voucher") =>
  must(
    await admin
      .from("prize_templates")
      .insert({ organization_id: orgId, name, category, stock_quantity: 5000 })
      .select("id")
      .single(),
    "template",
  ).id;

const addItem = async (orgId, templateId, index, value, expiresAt = null) =>
  must(
    await admin
      .from("prize_template_items")
      .insert({
        prize_template_id: templateId,
        organization_id: orgId,
        item_index: index,
        item_value: value,
        expires_at: expiresAt,
      })
      .select("id")
      .single(),
    "item",
  ).id;

const makeCampaign = async (orgId, autoPace) =>
  must(
    await admin
      .from("campaigns")
      .insert({
        organization_id: orgId,
        name: `probe-${tag}`,
        slug: `probe-${randomUUID()}`,
        status: "active",
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        win_probability: 1,
        auto_pace_prizes: autoPace,
      })
      .select("id")
      .single(),
    "campaign",
  ).id;

async function makePrize(orgId, campaignId, templateId, name, quantity = 1000) {
  const prize = must(
    await admin
      .from("prizes")
      .insert({ campaign_id: campaignId, organization_id: orgId, prize_template_id: templateId, name, quantity })
      .select("id")
      .single(),
    "prize",
  );
  must(
    await admin.from("prize_inventory").insert({
      prize_id: prize.id,
      campaign_id: campaignId,
      organization_id: orgId,
      initial_quantity: quantity,
      remaining: quantity,
    }),
    "inventory",
  );
  return prize.id;
}

const makeEntry = async (orgId, campaignId, fields = {}) =>
  must(
    await admin
      .from("entries")
      .insert({ campaign_id: campaignId, organization_id: orgId, ...fields })
      .select("id")
      .single(),
    "entry",
  ).id;

const claim = async (prizeId, entryId) => {
  const { data, error } = await admin.rpc("claim_campaign_prize_coupon", {
    p_prize_id: prizeId,
    p_entry_id: entryId,
  });
  if (error) throw new Error(`claim: ${error.message}`);
  return data;
};

async function expiryAndConcurrency(orgId) {
  const campaign = await makeCampaign(orgId, false);

  // Expired + valid: the valid one. Only expired: nothing, and no error.
  const tpl = await makeTemplate(orgId, "expiry");
  await addItem(orgId, tpl, 1, "EXPIRED", new Date(Date.now() - 86400000).toISOString());
  await addItem(orgId, tpl, 2, "VALID");
  const prize = await makePrize(orgId, campaign, tpl, "expiry");
  const first = await claim(prize, await makeEntry(orgId, campaign));
  check("an expired code is skipped, the valid one is given", first === "VALID", `got ${first}`);
  const second = await claim(prize, await makeEntry(orgId, campaign));
  check("only an expired code left: nothing is given, no error", second === null, `got ${second}`);

  // A code with a future date is given.
  const tplFuture = await makeTemplate(orgId, "future");
  await addItem(orgId, tplFuture, 1, "FUTURE", new Date(Date.now() + 86400000).toISOString());
  const prizeFuture = await makePrize(orgId, campaign, tplFuture, "future");
  const future = await claim(prizeFuture, await makeEntry(orgId, campaign));
  check("a code that expires later is given", future === "FUTURE", `got ${future}`);

  // Six winners at once, five codes: five different codes, the sixth gets nothing.
  const tplMany = await makeTemplate(orgId, "concurrent");
  for (let i = 1; i <= 5; i += 1) await addItem(orgId, tplMany, i, `CODE-${i}`);
  const prizeMany = await makePrize(orgId, campaign, tplMany, "concurrent");
  const entries = await Promise.all(Array.from({ length: 6 }, () => makeEntry(orgId, campaign)));
  const codes = await Promise.all(entries.map((id) => claim(prizeMany, id)));
  const given = codes.filter(Boolean);
  check(
    "6 simultaneous winners, 5 codes: 5 different codes, 1 without",
    given.length === 5 && new Set(given).size === 5,
    `codes ${JSON.stringify(codes)}`,
  );
}

async function drawFilter(orgId) {
  for (const autoPace of [false, true]) {
    const mode = autoPace ? "auto-pace" : "probability";
    const campaign = await makeCampaign(orgId, autoPace);
    const exhausted = await makeTemplate(orgId, `exhausted-${mode}`);
    await addItem(orgId, exhausted, 1, "OLD", new Date(Date.now() - 86400000).toISOString());
    const codeless = await makeTemplate(orgId, `codeless-${mode}`);
    const prizeExhausted = await makePrize(orgId, campaign, exhausted, "exhausted");
    const prizeCodeless = await makePrize(orgId, campaign, codeless, "codeless");

    let wonExhausted = 0;
    let wonCodeless = 0;
    for (let batch = 0; batch < 10; batch += 1) {
      const draws = await Promise.all(
        Array.from({ length: 20 }, () =>
          admin.rpc("draw_and_claim_campaign_prize", { p_campaign_id: campaign, p_quiz_passed: null }),
        ),
      );
      for (const { data, error } of draws) {
        if (error) throw new Error(`draw: ${error.message}`);
        if (data?.is_winner && data.prize_id === prizeExhausted) wonExhausted += 1;
        if (data?.is_winner && data.prize_id === prizeCodeless) wonCodeless += 1;
      }
    }
    check(`${mode}: a reward whose codes all expired is never drawn (200 draws)`, wonExhausted === 0, `won ${wonExhausted}`);
    check(`${mode}: a reward with no code at all can still be drawn`, wonCodeless > 0, `won ${wonCodeless}`);
  }
}

async function delivery(orgId, otherOrgId) {
  const campaign = await makeCampaign(orgId, false);
  const physical = await makeTemplate(orgId, "physical", "physical");
  const digital = await makeTemplate(orgId, "digital", "voucher");
  const prizePhysical = await makePrize(orgId, campaign, physical, "physical", 10);
  const prizeDigital = await makePrize(orgId, campaign, digital, "digital", 10);
  const physicalWin = await makeEntry(orgId, campaign, { is_winner: true, prize_id: prizePhysical });
  const digitalWin = await makeEntry(orgId, campaign, { is_winner: true, prize_id: prizeDigital });
  const loss = await makeEntry(orgId, campaign, { is_winner: false });

  const manager = await makeMember(orgId, "manager", "manager");
  const viewer = await makeMember(orgId, "viewer", "viewer");
  const stranger = await makeMember(otherOrgId, "stranger", "owner");

  const call = (client, entryId, status) =>
    client.rpc("set_entry_delivery_status", { p_entry_id: entryId, p_status: status });
  const stored = async () =>
    must(
      await admin.from("entries").select("delivery_status, delivered_at").eq("id", physicalWin).single(),
      "read entry",
    );

  check("delivery: a new win starts as not_delivered", (await stored()).delivery_status === "not_delivered");

  const ok = await call(manager, physicalWin, "delivered");
  const afterSet = await stored();
  check(
    "delivery: a manager sets delivered (date recorded)",
    !ok.error && afterSet.delivery_status === "delivered" && afterSet.delivered_at !== null,
    ok.error?.message ?? "",
  );
  const back = await call(manager, physicalWin, "not_delivered");
  const afterBack = await stored();
  check(
    "delivery: a manager sets it back to not_delivered (date cleared)",
    !back.error && afterBack.delivery_status === "not_delivered" && afterBack.delivered_at === null,
  );

  const refused = [
    ["a viewer", await call(viewer, physicalWin, "delivered")],
    ["a member of another organization", await call(stranger, physicalWin, "delivered")],
    ["a losing entry", await call(manager, loss, "delivered")],
    ["a digital reward", await call(manager, digitalWin, "delivered")],
    ["a status outside the list", await call(manager, physicalWin, "shipped")],
    ["an anonymous visitor", await call(anon, physicalWin, "delivered")],
  ];
  for (const [who, { error }] of refused) {
    check(`delivery: refused for ${who}`, Boolean(error), error?.message ?? "no error: the call went through");
  }
  check("delivery: nothing changed after the refusals", (await stored()).delivery_status === "not_delivered");

  const direct = await manager.from("entries").update({ delivery_status: "delivered" }).eq("id", physicalWin);
  check(
    "delivery: a member cannot update the status directly on entries",
    Boolean(direct.error) && (await stored()).delivery_status === "not_delivered",
    direct.error?.message ?? "no error: the update went through",
  );
  const directViewer = await viewer.from("entries").update({ delivery_status: "delivered" }).eq("id", physicalWin);
  check(
    "delivery: a viewer cannot update the status directly on entries",
    Boolean(directViewer.error) && (await stored()).delivery_status === "not_delivered",
    directViewer.error?.message ?? "no error: the update went through",
  );

  const helper = await anon.rpc("is_code_assignable", { p_item_id: randomUUID() });
  check("anon cannot call is_code_assignable", helper.error?.code === "42501", helper.error?.message ?? "");
}

async function cleanup() {
  for (const id of created.orgIds) await admin.from("organizations").delete().eq("id", id);
  for (const id of created.userIds) await admin.auth.admin.deleteUser(id);
}

try {
  const orgId = await makeOrg("main");
  const otherOrgId = await makeOrg("other");
  await expiryAndConcurrency(orgId);
  await drawFilter(orgId);
  await delivery(orgId, otherOrgId);
} catch (error) {
  console.error(`ERROR ${error instanceof Error ? error.message : error}`);
  results.push(false);
} finally {
  await cleanup();
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed.`);
process.exit(passed === results.length ? 0 : 1);
