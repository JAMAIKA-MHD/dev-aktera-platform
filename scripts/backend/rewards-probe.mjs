#!/usr/bin/env node
// Probe of the Reward Library rules on the local Supabase stack (reward library task T1.7).
//
//   npm run backend:rewards
//
// Checks, on throwaway data it creates and deletes:
//   - a code that expired is never handed to a winner, a valid one is;
//   - a reward valid for a period after delivery: the deadline is set when the code is given and
//     does not move afterwards;
//   - the expiry set on the reward applies to its codes, a date on a code wins, and a physical
//     reward cannot carry one;
//   - two winners at the same time never get the same code;
//   - a reward whose codes are all used or expired is never drawn (both draw modes);
//   - a reward with no code at all can still be drawn (the "You Won!" without reward case);
//   - the partners a brand registers (reward_partners): members read, a viewer cannot write,
//     another organization sees nothing, anon nothing, bad data is refused;
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
  console.error(
    `Refusing to run: VITE_SUPABASE_URL is "${url}", not the local stack.`,
  );
  process.exit(2);
}
if (!anonKey || !serviceKey) {
  console.error(
    "Missing VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY (.env.local).",
  );
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
      .insert({
        name: `probe-${label}-${tag}`,
        slug: `probe-${label}-${tag}`,
        contact_email: `${label}-${tag}@probe.test`,
      })
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
    await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    }),
    "user",
  ).user;
  created.userIds.push(user.id);
  must(
    await admin.from("profiles").insert({
      id: user.id,
      organization_id: orgId,
      full_name: label,
      email,
      role,
    }),
    "profile",
  );
  const client = createClient(url, anonKey, options);
  must(
    await client.auth.signInWithPassword({ email, password: PASSWORD }),
    "sign in",
  );
  return client;
}

const makeTemplate = async (orgId, name, category = "voucher", extra = {}) =>
  must(
    await admin
      .from("prize_templates")
      .insert({
        organization_id: orgId,
        name,
        category,
        stock_quantity: 5000,
        ...extra,
      })
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
      .insert({
        campaign_id: campaignId,
        organization_id: orgId,
        prize_template_id: templateId,
        name,
        quantity,
      })
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
  await addItem(
    orgId,
    tpl,
    1,
    "EXPIRED",
    new Date(Date.now() - 86400000).toISOString(),
  );
  await addItem(orgId, tpl, 2, "VALID");
  const prize = await makePrize(orgId, campaign, tpl, "expiry");
  const first = await claim(prize, await makeEntry(orgId, campaign));
  check(
    "an expired code is skipped, the valid one is given",
    first === "VALID",
    `got ${first}`,
  );
  const second = await claim(prize, await makeEntry(orgId, campaign));
  check(
    "only an expired code left: nothing is given, no error",
    second === null,
    `got ${second}`,
  );

  // A code with a future date is given.
  const tplFuture = await makeTemplate(orgId, "future");
  await addItem(
    orgId,
    tplFuture,
    1,
    "FUTURE",
    new Date(Date.now() + 86400000).toISOString(),
  );
  const prizeFuture = await makePrize(orgId, campaign, tplFuture, "future");
  const future = await claim(prizeFuture, await makeEntry(orgId, campaign));
  check(
    "a code that expires later is given",
    future === "FUTURE",
    `got ${future}`,
  );

  // Six winners at once, five codes: five different codes, the sixth gets nothing.
  const tplMany = await makeTemplate(orgId, "concurrent");
  for (let i = 1; i <= 5; i += 1) await addItem(orgId, tplMany, i, `CODE-${i}`);
  const prizeMany = await makePrize(orgId, campaign, tplMany, "concurrent");
  const entries = await Promise.all(
    Array.from({ length: 6 }, () => makeEntry(orgId, campaign)),
  );
  const codes = await Promise.all(entries.map((id) => claim(prizeMany, id)));
  const given = codes.filter(Boolean);
  check(
    "6 simultaneous winners, 5 codes: 5 different codes, 1 without",
    given.length === 5 && new Set(given).size === 5,
    `codes ${JSON.stringify(codes)}`,
  );
}

async function rewardLevelExpiry(orgId) {
  const campaign = await makeCampaign(orgId, false);
  const past = new Date(Date.now() - 86400000).toISOString();
  const future = new Date(Date.now() + 86400000).toISOString();

  // The reward's own date applies to codes that have none.
  const expiredReward = await makeTemplate(orgId, "reward-expired", "voucher", {
    expires_at: past,
  });
  await addItem(orgId, expiredReward, 1, "NO-OWN-DATE");
  const prizeExpired = await makePrize(
    orgId,
    campaign,
    expiredReward,
    "reward-expired",
  );
  const none = await claim(prizeExpired, await makeEntry(orgId, campaign));
  check(
    "reward expiry: a code without its own date expires with its reward",
    none === null,
    `got ${none}`,
  );

  // A date on the code wins over the reward's date, in both directions.
  const mixed = await makeTemplate(orgId, "reward-mixed", "voucher", {
    expires_at: past,
  });
  await addItem(orgId, mixed, 1, "OWN-FUTURE", future);
  const prizeMixed = await makePrize(orgId, campaign, mixed, "reward-mixed");
  const own = await claim(prizeMixed, await makeEntry(orgId, campaign));
  check(
    "reward expiry: a code with a later date of its own is still given",
    own === "OWN-FUTURE",
    `got ${own}`,
  );

  const laterReward = await makeTemplate(orgId, "reward-later", "voucher", {
    expires_at: future,
  });
  await addItem(orgId, laterReward, 1, "OWN-PAST", past);
  await addItem(orgId, laterReward, 2, "INHERITS");
  const prizeLater = await makePrize(
    orgId,
    campaign,
    laterReward,
    "reward-later",
  );
  const first = await claim(prizeLater, await makeEntry(orgId, campaign));
  check(
    "reward expiry: a code that expired on its own is skipped, the one inheriting a future date is given",
    first === "INHERITS",
    `got ${first}`,
  );

  // No date on the reward: nothing changes for the codes.
  const open = await makeTemplate(orgId, "reward-open");
  await addItem(orgId, open, 1, "FOREVER");
  const prizeOpen = await makePrize(orgId, campaign, open, "reward-open");
  const forever = await claim(prizeOpen, await makeEntry(orgId, campaign));
  check(
    "reward expiry: a reward without a date keeps giving its codes",
    forever === "FOREVER",
    `got ${forever}`,
  );

  // The draw leaves out a reward whose date has passed.
  const drawCampaign = await makeCampaign(orgId, false);
  const lapsed = await makeTemplate(orgId, "reward-lapsed", "voucher", {
    expires_at: past,
  });
  await addItem(orgId, lapsed, 1, "LAPSED");
  const prizeLapsed = await makePrize(orgId, drawCampaign, lapsed, "lapsed");
  let wonLapsed = 0;
  const draws = await Promise.all(
    Array.from({ length: 40 }, () =>
      admin.rpc("draw_and_claim_campaign_prize", {
        p_campaign_id: drawCampaign,
        p_quiz_passed: null,
      }),
    ),
  );
  for (const { data } of draws)
    if (data?.is_winner && data.prize_id === prizeLapsed) wonLapsed += 1;
  check(
    "reward expiry: a reward whose date has passed is never drawn (40 draws)",
    wonLapsed === 0,
    `won ${wonLapsed}`,
  );

  const physical = await admin.from("prize_templates").insert({
    organization_id: orgId,
    name: "phys-with-date",
    category: "physical",
    stock_quantity: 1,
    expires_at: future,
  });
  check(
    "reward expiry: a physical reward cannot carry an expiry date",
    Boolean(physical.error),
    physical.error?.message ?? "no error",
  );

  const switched = await admin
    .from("prize_templates")
    .update({ category: "physical" })
    .eq("id", mixed);
  check(
    "reward expiry: a reward with a date cannot become physical while it keeps it",
    Boolean(switched.error),
    switched.error?.message ?? "no error",
  );
}

// The end of the day `days` after today, in Algiers (UTC+1, no daylight saving), as a UTC instant.
const algiersEndOfDayIn = (days) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const day = new Date(`${today}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return `${day.toISOString().slice(0, 10)}T22:59:59.000Z`;
};

const redemptionOf = async (entryId) =>
  must(
    await admin
      .from("coupon_redemptions")
      .select("expires_at")
      .eq("entry_id", entryId)
      .single(),
    "redemption",
  );

const expiryOf = async (entryId) => {
  const { data, error } = await admin.rpc("coupon_expiry_for_entry", {
    p_entry_id: entryId,
  });
  if (error) throw new Error(`coupon_expiry_for_entry: ${error.message}`);
  return data ? new Date(data).toISOString() : null;
};

async function expiryAfterDelivery(orgId) {
  const campaign = await makeCampaign(orgId, false);

  // A validity period: the deadline starts when the code is given.
  const period = await makeTemplate(orgId, "period-30", "voucher", {
    expiry_days: 30,
  });
  await addItem(orgId, period, 1, "P-1");
  await addItem(orgId, period, 2, "P-2", "2099-01-01T22:59:59.000Z");
  const prizePeriod = await makePrize(orgId, campaign, period, "period-30");

  const entry = await makeEntry(orgId, campaign);
  const code = await claim(prizePeriod, entry);
  const expected = algiersEndOfDayIn(30);
  const stored = (await redemptionOf(entry)).expires_at;
  check(
    "after delivery: the deadline is the end of the day 30 days later, in Algiers",
    code === "P-1" && new Date(stored).toISOString() === expected,
    `${code} ${stored} expected ${expected}`,
  );
  check(
    "after delivery: the winner's deadline is readable (coupon_expiry_for_entry)",
    (await expiryOf(entry)) === expected,
  );

  // The deadline of a winner who already has the code does not move when the reward changes.
  must(
    await admin
      .from("prize_templates")
      .update({ expiry_days: 5 })
      .eq("id", period),
    "update",
  );
  check(
    "after delivery: changing the period later does not move a deadline already given",
    (await expiryOf(entry)) === expected,
  );

  // A code with a date of its own keeps it, whatever the period.
  const entry2 = await makeEntry(orgId, campaign);
  const code2 = await claim(prizePeriod, entry2);
  check(
    "after delivery: a code with its own date keeps it",
    code2 === "P-2" && (await expiryOf(entry2)) === "2099-01-01T22:59:59.000Z",
    `${code2} ${await expiryOf(entry2)}`,
  );

  // A code is not "expired" before it is given, whatever the period.
  const young = await makeTemplate(orgId, "period-1", "voucher", {
    expiry_days: 1,
  });
  await addItem(orgId, young, 1, "Y-1");
  const prizeYoung = await makePrize(orgId, campaign, young, "period-1");
  const youngItem = must(
    await admin
      .from("prize_template_items")
      .select("id")
      .eq("prize_template_id", young)
      .single(),
    "item",
  );
  const assignable = await admin.rpc("is_code_assignable", {
    p_item_id: youngItem.id,
  });
  check(
    "after delivery: a code not given yet is assignable",
    assignable.data === true,
    String(assignable.error?.message ?? assignable.data),
  );
  void prizeYoung;

  // Fixed date and no date keep working.
  const fixed = await makeTemplate(orgId, "fixed", "voucher", {
    expires_at: "2099-03-01T22:59:59.000Z",
  });
  await addItem(orgId, fixed, 1, "F-1");
  const prizeFixed = await makePrize(orgId, campaign, fixed, "fixed");
  const entry3 = await makeEntry(orgId, campaign);
  await claim(prizeFixed, entry3);
  check(
    "after delivery: a fixed-date reward gives its date, nothing is stored on the redemption",
    (await expiryOf(entry3)) === "2099-03-01T22:59:59.000Z" &&
      (await redemptionOf(entry3)).expires_at === null,
  );

  const none = await makeTemplate(orgId, "none");
  await addItem(orgId, none, 1, "N-1");
  const prizeNone = await makePrize(orgId, campaign, none, "none");
  const entry4 = await makeEntry(orgId, campaign);
  await claim(prizeNone, entry4);
  check(
    "after delivery: a reward without expiry has no deadline",
    (await expiryOf(entry4)) === null,
  );

  // What the database refuses.
  const both = await admin
    .from("prize_templates")
    .insert({
      organization_id: orgId,
      name: "both",
      category: "voucher",
      stock_quantity: 1,
      expires_at: "2099-01-01T00:00:00Z",
      expiry_days: 10,
    });
  check(
    "after delivery: a date and a period together are refused",
    Boolean(both.error),
    both.error?.message ?? "no error",
  );
  const physical = await admin
    .from("prize_templates")
    .insert({
      organization_id: orgId,
      name: "phys-days",
      category: "physical",
      stock_quantity: 1,
      expiry_days: 10,
    });
  check(
    "after delivery: a physical reward cannot have a period",
    Boolean(physical.error),
    physical.error?.message ?? "no error",
  );
  for (const days of [0, -3, 3651]) {
    const bad = await admin
      .from("prize_templates")
      .insert({
        organization_id: orgId,
        name: `bad-${days}`,
        category: "voucher",
        stock_quantity: 1,
        expiry_days: days,
      });
    check(
      `after delivery: a period of ${days} days is refused`,
      Boolean(bad.error),
      bad.error?.message ?? "no error",
    );
  }

  const anonCall = await anon.rpc("coupon_expiry_for_entry", {
    p_entry_id: randomUUID(),
  });
  check(
    "after delivery: anon cannot read a deadline",
    anonCall.error?.code === "42501",
    anonCall.error?.message ?? "",
  );
}

async function drawFilter(orgId) {
  for (const autoPace of [false, true]) {
    const mode = autoPace ? "auto-pace" : "probability";
    const campaign = await makeCampaign(orgId, autoPace);
    const exhausted = await makeTemplate(orgId, `exhausted-${mode}`);
    await addItem(
      orgId,
      exhausted,
      1,
      "OLD",
      new Date(Date.now() - 86400000).toISOString(),
    );
    const codeless = await makeTemplate(orgId, `codeless-${mode}`);
    const prizeExhausted = await makePrize(
      orgId,
      campaign,
      exhausted,
      "exhausted",
    );
    const prizeCodeless = await makePrize(
      orgId,
      campaign,
      codeless,
      "codeless",
    );

    let wonExhausted = 0;
    let wonCodeless = 0;
    for (let batch = 0; batch < 10; batch += 1) {
      const draws = await Promise.all(
        Array.from({ length: 20 }, () =>
          admin.rpc("draw_and_claim_campaign_prize", {
            p_campaign_id: campaign,
            p_quiz_passed: null,
          }),
        ),
      );
      for (const { data, error } of draws) {
        if (error) throw new Error(`draw: ${error.message}`);
        if (data?.is_winner && data.prize_id === prizeExhausted)
          wonExhausted += 1;
        if (data?.is_winner && data.prize_id === prizeCodeless)
          wonCodeless += 1;
      }
    }
    check(
      `${mode}: a reward whose codes all expired is never drawn (200 draws)`,
      wonExhausted === 0,
      `won ${wonExhausted}`,
    );
    check(
      `${mode}: a reward with no code at all can still be drawn`,
      wonCodeless > 0,
      `won ${wonCodeless}`,
    );
  }
}

async function delivery(orgId, otherOrgId) {
  const campaign = await makeCampaign(orgId, false);
  const physical = await makeTemplate(orgId, "physical", "physical");
  const digital = await makeTemplate(orgId, "digital", "voucher");
  const prizePhysical = await makePrize(
    orgId,
    campaign,
    physical,
    "physical",
    10,
  );
  const prizeDigital = await makePrize(orgId, campaign, digital, "digital", 10);
  const physicalWin = await makeEntry(orgId, campaign, {
    is_winner: true,
    prize_id: prizePhysical,
  });
  const digitalWin = await makeEntry(orgId, campaign, {
    is_winner: true,
    prize_id: prizeDigital,
  });
  const loss = await makeEntry(orgId, campaign, { is_winner: false });

  const manager = await makeMember(orgId, "manager", "manager");
  const viewer = await makeMember(orgId, "viewer", "viewer");
  const stranger = await makeMember(otherOrgId, "stranger", "owner");

  const call = (client, entryId, status) =>
    client.rpc("set_entry_delivery_status", {
      p_entry_id: entryId,
      p_status: status,
    });
  const stored = async () =>
    must(
      await admin
        .from("entries")
        .select("delivery_status, delivered_at")
        .eq("id", physicalWin)
        .single(),
      "read entry",
    );

  check(
    "delivery: a new win starts as not_delivered",
    (await stored()).delivery_status === "not_delivered",
  );

  const ok = await call(manager, physicalWin, "delivered");
  const afterSet = await stored();
  check(
    "delivery: a manager sets delivered (date recorded)",
    !ok.error &&
      afterSet.delivery_status === "delivered" &&
      afterSet.delivered_at !== null,
    ok.error?.message ?? "",
  );
  const back = await call(manager, physicalWin, "not_delivered");
  const afterBack = await stored();
  check(
    "delivery: a manager sets it back to not_delivered (date cleared)",
    !back.error &&
      afterBack.delivery_status === "not_delivered" &&
      afterBack.delivered_at === null,
  );

  const refused = [
    ["a viewer", await call(viewer, physicalWin, "delivered")],
    [
      "a member of another organization",
      await call(stranger, physicalWin, "delivered"),
    ],
    ["a losing entry", await call(manager, loss, "delivered")],
    ["a digital reward", await call(manager, digitalWin, "delivered")],
    ["a status outside the list", await call(manager, physicalWin, "shipped")],
    ["an anonymous visitor", await call(anon, physicalWin, "delivered")],
  ];
  for (const [who, { error }] of refused) {
    check(
      `delivery: refused for ${who}`,
      Boolean(error),
      error?.message ?? "no error: the call went through",
    );
  }
  check(
    "delivery: nothing changed after the refusals",
    (await stored()).delivery_status === "not_delivered",
  );

  const direct = await manager
    .from("entries")
    .update({ delivery_status: "delivered" })
    .eq("id", physicalWin);
  check(
    "delivery: a member cannot update the status directly on entries",
    Boolean(direct.error) &&
      (await stored()).delivery_status === "not_delivered",
    direct.error?.message ?? "no error: the update went through",
  );
  const directViewer = await viewer
    .from("entries")
    .update({ delivery_status: "delivered" })
    .eq("id", physicalWin);
  check(
    "delivery: a viewer cannot update the status directly on entries",
    Boolean(directViewer.error) &&
      (await stored()).delivery_status === "not_delivered",
    directViewer.error?.message ?? "no error: the update went through",
  );

  const helper = await anon.rpc("is_code_assignable", {
    p_item_id: randomUUID(),
  });
  check(
    "anon cannot call is_code_assignable",
    helper.error?.code === "42501",
    helper.error?.message ?? "",
  );
}

async function partners(orgId, otherOrgId) {
  const manager = await makeMember(orgId, "pmanager", "manager");
  const viewer = await makeMember(orgId, "pviewer", "viewer");
  const stranger = await makeMember(otherOrgId, "pstranger", "owner");

  const added = await manager
    .from("reward_partners")
    .insert({
      organization_id: orgId,
      name: "Acme Gifts",
      description: "Gift cards",
      website_url: "https://acme.example",
      contact_email: "hello@acme.example",
    })
    .select("id, created_by")
    .single();
  check(
    "partners: a manager adds a partner",
    !added.error,
    added.error?.message ?? "",
  );
  const partnerId = added.data?.id;

  const listed = await viewer.from("reward_partners").select("id");
  check(
    "partners: a viewer reads the list of their organization",
    !listed.error && listed.data.length === 1,
    listed.error?.message ?? `${listed.data?.length} row(s)`,
  );

  const viewerInsert = await viewer
    .from("reward_partners")
    .insert({ organization_id: orgId, name: "Viewer partner" });
  check(
    "partners: a viewer cannot add one",
    Boolean(viewerInsert.error),
    viewerInsert.error?.message ?? "no error",
  );

  const viewerDelete = await viewer
    .from("reward_partners")
    .delete()
    .eq("id", partnerId)
    .select("id");
  check(
    "partners: a viewer cannot remove one",
    !viewerDelete.error && viewerDelete.data.length === 0,
    viewerDelete.error?.message ??
      `${viewerDelete.data?.length} row(s) deleted`,
  );

  const foreignRead = await stranger.from("reward_partners").select("id");
  check(
    "partners: another organization sees none of them",
    !foreignRead.error && foreignRead.data.length === 0,
    foreignRead.error?.message ?? `${foreignRead.data?.length} row(s)`,
  );

  const foreignInsert = await stranger
    .from("reward_partners")
    .insert({ organization_id: orgId, name: "Intruder" });
  check(
    "partners: another organization cannot add to ours",
    Boolean(foreignInsert.error),
    foreignInsert.error?.message ?? "no error",
  );

  const foreignUpdate = await stranger
    .from("reward_partners")
    .update({ name: "Hijacked" })
    .eq("id", partnerId)
    .select("id");
  check(
    "partners: another organization cannot rename ours",
    !foreignUpdate.error && foreignUpdate.data.length === 0,
    foreignUpdate.error?.message ??
      `${foreignUpdate.data?.length} row(s) updated`,
  );

  const duplicate = await manager
    .from("reward_partners")
    .insert({ organization_id: orgId, name: "  acme gifts " });
  check(
    "partners: the same name twice is refused (any case)",
    duplicate.error?.code === "23505",
    duplicate.error?.message ?? "no error",
  );

  const badEmail = await manager.from("reward_partners").insert({
    organization_id: orgId,
    name: "Bad email",
    contact_email: "not-an-email",
  });
  check(
    "partners: an invalid email is refused",
    Boolean(badEmail.error),
    badEmail.error?.message ?? "no error",
  );

  const badUrl = await manager.from("reward_partners").insert({
    organization_id: orgId,
    name: "Bad url",
    website_url: "javascript:alert(1)",
  });
  check(
    "partners: a website that is not http(s) is refused",
    Boolean(badUrl.error),
    badUrl.error?.message ?? "no error",
  );

  const tooShort = await manager
    .from("reward_partners")
    .insert({ organization_id: orgId, name: " a " });
  check(
    "partners: a one-letter name is refused",
    Boolean(tooShort.error),
    tooShort.error?.message ?? "no error",
  );

  const anonRead = await anon.from("reward_partners").select("id");
  check(
    "partners: anon cannot read them",
    anonRead.error?.code === "42501" || (anonRead.data ?? []).length === 0,
    anonRead.error?.message ?? `${anonRead.data?.length} row(s)`,
  );
  const anonInsert = await anon
    .from("reward_partners")
    .insert({ organization_id: orgId, name: "Anon partner" });
  check(
    "partners: anon cannot add one",
    Boolean(anonInsert.error),
    anonInsert.error?.message ?? "no error",
  );

  const removed = await manager
    .from("reward_partners")
    .delete()
    .eq("id", partnerId)
    .select("id");
  check(
    "partners: a manager removes a partner",
    !removed.error && removed.data.length === 1,
    removed.error?.message ?? "",
  );
}

async function cleanup() {
  for (const id of created.orgIds)
    await admin.from("organizations").delete().eq("id", id);
  for (const id of created.userIds) await admin.auth.admin.deleteUser(id);
}

try {
  const orgId = await makeOrg("main");
  const otherOrgId = await makeOrg("other");
  await expiryAndConcurrency(orgId);
  await rewardLevelExpiry(orgId);
  await expiryAfterDelivery(orgId);
  await drawFilter(orgId);
  await delivery(orgId, otherOrgId);
  await partners(orgId, otherOrgId);
} catch (error) {
  console.error(`ERROR ${error instanceof Error ? error.message : error}`);
  results.push(false);
} finally {
  await cleanup();
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed.`);
process.exit(passed === results.length ? 0 : 1);
