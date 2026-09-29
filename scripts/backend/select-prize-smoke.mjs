#!/usr/bin/env node
// End-to-end check of the select-prize Edge Function on the local stack (backend task B2.1).
//
//   npx supabase functions serve --env-file .env.local   (in another terminal)
//   npm run backend:smoke
//
// It creates its own prize template, coupon codes and campaigns (organization of the first
// campaign found), plays every scenario through the function as an anonymous player, then
// deletes everything it created. Local stack only: it refuses to run against any other URL.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = (process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!["http://127.0.0.1:54321", "http://localhost:54321"].includes(url)) {
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

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const RUN = randomUUID().slice(0, 8);
const DAY = 24 * 60 * 60 * 1000;
const iso = (offset) => new Date(Date.now() + offset).toISOString();
let phoneSeq = 0;
const newPhone = () =>
  `055${String(Number.parseInt(RUN.slice(0, 5), 16) % 10000).padStart(4, "0")}${String(phoneSeq++).padStart(3, "0")}`;

const consent = () => ({
  accepted: true,
  acceptedAt: new Date().toISOString(),
  policyVersion: "2026-09-01",
  locale: "fr",
});

async function play(campaignId, overrides = {}) {
  const body = {
    campaign_id: campaignId,
    phone_number: newPhone(),
    participant_name: "Smoke Test",
    game_payload: {},
    metadata: {
      source: "smoke_test",
      client_request_id: randomUUID(),
      consent: consent(),
    },
    ...overrides,
  };
  const response = await fetch(`${url}/functions/v1/select-prize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON body (gateway error): payload stays null.
  }
  return { status: response.status, body: payload, request: body };
}

// ── Fixtures ────────────────────────────────────────────────────────────────────────────

const created = { templateId: null, campaignIds: [] };

async function setup() {
  const { data: anyCampaign, error } = await admin
    .from("campaigns")
    .select("organization_id")
    .limit(1)
    .single();
  if (error)
    throw new Error(
      `No campaign to borrow an organization from: ${error.message}`,
    );
  const org = anyCampaign.organization_id;

  const { data: template, error: templateError } = await admin
    .from("prize_templates")
    .insert({
      organization_id: org,
      name: `smoke ${RUN}`,
      category: "voucher",
      stock_quantity: 100,
    })
    .select("id")
    .single();
  if (templateError) throw templateError;
  created.templateId = template.id;

  const codes = Array.from({ length: 40 }, (_, i) => ({
    prize_template_id: template.id,
    organization_id: org,
    item_index: i + 1,
    item_value: `SMOKE-${RUN}-${String(i + 1).padStart(2, "0")}`,
  }));
  const { error: codesError } = await admin
    .from("prize_template_items")
    .insert(codes);
  if (codesError) throw codesError;

  async function campaign(key, fields, quantity) {
    const id = randomUUID();
    const { error: campaignError } = await admin.from("campaigns").insert({
      id,
      organization_id: org,
      name: `smoke ${RUN} ${key}`,
      slug: `smoke-${RUN}-${key}`,
      status: "active",
      start_date: iso(-DAY),
      end_date: iso(DAY),
      win_probability: 1,
      max_entries: 1,
      require_quiz: false,
      auto_pace_prizes: false,
      game_type: "lucky_wheel",
      game_logic_config: {},
      ...fields,
    });
    if (campaignError) throw campaignError;
    created.campaignIds.push(id);
    const prizeId = randomUUID();
    const { error: prizeError } = await admin.from("prizes").insert({
      id: prizeId,
      campaign_id: id,
      organization_id: org,
      prize_template_id: template.id,
      name: `smoke prize ${key}`,
      quantity,
      quantity_won: 0,
      weight: 1,
      is_active: true,
    });
    if (prizeError) throw prizeError;
    const { error: inventoryError } = await admin
      .from("prize_inventory")
      .insert({
        prize_id: prizeId,
        campaign_id: id,
        organization_id: org,
        initial_quantity: quantity,
        remaining: quantity,
        claimed: 0,
      });
    if (inventoryError) throw inventoryError;
    return { id, prizeId, org };
  }

  const wheel = await campaign("wheel", {}, 20);
  const paused = await campaign("paused", { status: "paused" }, 1);
  const ended = await campaign(
    "ended",
    { start_date: iso(-3 * DAY), end_date: iso(-DAY) },
    1,
  );
  const hitIt = await campaign(
    "hitit",
    { game_type: "hit_it", game_logic_config: { win_threshold: 8 } },
    5,
  );
  const quiz = await campaign(
    "quiz",
    {
      game_type: "quiz",
      game_logic_config: { pass_threshold_percentage: 100 },
    },
    5,
  );
  const soldOut = await campaign("soldout", {}, 1);

  const questionId = randomUUID();
  const { error: questionError } = await admin.from("quiz_questions").insert({
    id: questionId,
    campaign_id: quiz.id,
    organization_id: org,
    question: "smoke?",
    options: ["a", "b", "c"],
    correct_option_index: 1,
    position: 1,
    is_active: true,
  });
  if (questionError) throw questionError;

  // The only prize of this campaign is already won.
  const { error: winnerError } = await admin.from("entries").insert({
    campaign_id: soldOut.id,
    organization_id: org,
    phone_number: newPhone(),
    is_winner: true,
    prize_id: soldOut.prizeId,
  });
  if (winnerError) throw winnerError;

  return { wheel, paused, ended, hitIt, quiz, soldOut, questionId };
}

async function cleanup() {
  const ids = created.campaignIds;
  if (ids.length) {
    // coupon_redemptions go with their entries (ON DELETE CASCADE).
    await admin.from("entries").delete().in("campaign_id", ids);
    await admin.from("campaign_impressions").delete().in("campaign_id", ids);
    await admin.from("prize_inventory").delete().in("campaign_id", ids);
    await admin.from("quiz_questions").delete().in("campaign_id", ids);
    await admin.from("prizes").delete().in("campaign_id", ids);
    await admin.from("campaigns").delete().in("id", ids);
  }
  if (created.templateId) {
    await admin
      .from("prize_template_items")
      .delete()
      .eq("prize_template_id", created.templateId);
    await admin.from("prize_templates").delete().eq("id", created.templateId);
  }
}

// ── Scenarios ───────────────────────────────────────────────────────────────────────────

const expectError = (result, status, code) => ({
  ok:
    result.status === status &&
    result.body?.code === code &&
    typeof result.body?.error === "string",
  detail: `HTTP ${result.status} ${JSON.stringify(result.body)}`,
});

function scenarios(f) {
  return [
    {
      name: "T1 no consent → 400 CONSENT_REQUIRED",
      run: async () =>
        expectError(
          await play(f.wheel.id, { metadata: { source: "smoke_test" } }),
          400,
          "CONSENT_REQUIRED",
        ),
    },
    {
      name: "T1b consent not accepted → 400 CONSENT_REQUIRED",
      run: async () =>
        expectError(
          await play(f.wheel.id, {
            metadata: { consent: { ...consent(), accepted: false } },
          }),
          400,
          "CONSENT_REQUIRED",
        ),
    },
    {
      name: "T2 invalid phone → 400 INVALID_INPUT",
      run: async () =>
        expectError(
          await play(f.wheel.id, { phone_number: "0212345678" }),
          400,
          "INVALID_INPUT",
        ),
    },
    {
      name: "T3 valid participation → winner with coupon, consent stored; T4 replay; T5 duplicate",
      run: async () => {
        const phone = newPhone();
        const requestId = randomUUID();
        const metadata = {
          source: "smoke_test",
          wilaya: "16",
          client_request_id: requestId,
          consent: consent(),
          human_token: "secret",
        };
        const first = await play(f.wheel.id, { phone_number: phone, metadata });
        if (first.status !== 200 || !first.body?.ok)
          return {
            ok: false,
            detail: `T3 ${first.status} ${JSON.stringify(first.body)}`,
          };
        const { data: row } = await admin
          .from("entries")
          .select("metadata, is_winner, redeemed_coupon_value")
          .eq("id", first.body.entry.id)
          .single();
        const t3 =
          first.body.prize?.id === f.wheel.prizeId &&
          first.body.coupon?.code?.startsWith(`SMOKE-${RUN}`) &&
          row.redeemed_coupon_value === first.body.coupon.code &&
          row.metadata?.consent?.policyVersion === "2026-09-01" &&
          row.metadata?.wilaya === "16" &&
          row.metadata?.client_request_id === requestId &&
          !("human_token" in row.metadata);
        if (!t3)
          return {
            ok: false,
            detail: `T3 stored ${JSON.stringify(row)} / ${JSON.stringify(first.body)}`,
          };

        const replay = await play(f.wheel.id, {
          phone_number: phone,
          metadata,
        });
        const { count } = await admin
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", f.wheel.id)
          .eq("phone_number", phone);
        const t4 =
          replay.status === 200 &&
          replay.body?.replayed === true &&
          replay.body.entry?.id === first.body.entry.id &&
          replay.body.coupon?.code === first.body.coupon.code &&
          count === 1;
        if (!t4)
          return {
            ok: false,
            detail: `T4 ${replay.status} ${JSON.stringify(replay.body)}, rows=${count}`,
          };

        const again = await play(f.wheel.id, { phone_number: phone });
        const t5 = expectError(again, 400, "ALREADY_PARTICIPATED");
        if (!t5.ok) return { ok: false, detail: `T5 ${t5.detail}` };
        return {
          ok: true,
          detail: `coupon ${first.body.coupon.code}, replay same entry, duplicate refused`,
        };
      },
    },
    {
      name: "T6 paused campaign → CAMPAIGN_CLOSED",
      run: async () =>
        expectError(await play(f.paused.id), 400, "CAMPAIGN_CLOSED"),
    },
    {
      name: "T6b active campaign past its end date → CAMPAIGN_CLOSED",
      run: async () =>
        expectError(await play(f.ended.id), 400, "CAMPAIGN_CLOSED"),
    },
    {
      name: "T6c unknown campaign → 404 CAMPAIGN_CLOSED",
      run: async () =>
        expectError(await play(randomUUID()), 404, "CAMPAIGN_CLOSED"),
    },
    {
      name: "T7 Hit It below the threshold ×20 → 0 winner, stock intact; above → winner",
      run: async () => {
        let winners = 0;
        for (let i = 0; i < 20; i += 1) {
          const result = await play(f.hitIt.id, { game_payload: { hits: 3 } });
          if (result.status !== 200)
            return {
              ok: false,
              detail: `game ${i}: ${result.status} ${JSON.stringify(result.body)}`,
            };
          if (result.body.prize) winners += 1;
        }
        const { data: stock } = await admin
          .from("prize_inventory")
          .select("remaining")
          .eq("prize_id", f.hitIt.prizeId)
          .single();
        const success = await play(f.hitIt.id, { game_payload: { hits: 9 } });
        return {
          ok:
            winners === 0 &&
            stock.remaining === 5 &&
            Boolean(success.body?.prize),
          detail: `${winners}/20 failed games won, stock ${stock.remaining}/5, 9 hits → ${success.body?.prize ? "winner" : "loser"}`,
        };
      },
    },
    {
      name: "T10 quiz: wrong answer → loser; right answer → winner",
      run: async () => {
        const wrong = await play(f.quiz.id, {
          game_payload: { answers: { [f.questionId]: 0 } },
        });
        const right = await play(f.quiz.id, {
          game_payload: { answers: { [f.questionId]: 1 } },
        });
        return {
          ok:
            wrong.status === 200 &&
            !wrong.body.prize &&
            right.status === 200 &&
            Boolean(right.body.prize),
          detail: `wrong → ${wrong.body?.prize ? "winner" : "loser"}, right → ${right.body?.prize ? "winner" : "loser"}`,
        };
      },
    },
    {
      // draw_and_claim_campaign_prize claims stock with FOR UPDATE SKIP LOCKED: a player drawing
      // at the very same moment as another one may lose instead of waiting (existing
      // behavior, out of this task's scope). What select-prize guarantees: every winner gets a
      // code, and two simultaneous winners never get the same one.
      name: "T8 10 players at the same time → every winner gets a code, all codes different",
      run: async () => {
        const results = await Promise.all(
          Array.from({ length: 10 }, () => play(f.wheel.id)),
        );
        const summary = results.map(
          (r) =>
            `${r.status}:${r.body?.prize ? "win" : "lose"}:${r.body?.coupon?.code ?? "-"}`,
        );
        const errors = results.filter((r) => r.status !== 200);
        const winners = results.filter((r) => r.body?.prize);
        const withCode = winners.filter((r) => r.body?.coupon?.code);
        const codes = new Set(withCode.map((r) => r.body.coupon.code));
        return {
          ok:
            errors.length === 0 &&
            winners.length >= 2 &&
            withCode.length === winners.length &&
            codes.size === winners.length,
          detail: `${winners.length} simultaneous winners, ${withCode.length} with a code, ${codes.size} distinct codes — ${summary.join(" ")}`,
        };
      },
    },
    {
      name: "T9 sold out → CAMPAIGN_CLOSED",
      run: async () =>
        expectError(await play(f.soldOut.id), 400, "CAMPAIGN_CLOSED"),
    },
  ];
}

// ── Run ─────────────────────────────────────────────────────────────────────────────────

try {
  const probe = await fetch(`${url}/functions/v1/select-prize`, {
    method: "OPTIONS",
  }).catch(() => null);
  if (!probe || probe.status >= 500) {
    console.error(
      "select-prize is not served. Run: npx supabase functions serve --env-file .env.local",
    );
    process.exit(2);
  }
} catch {
  process.exit(2);
}

let failures = 0;
let total = 0;
try {
  const fixtures = await setup();
  console.log(`select-prize smoke test — ${url} (run ${RUN})\n`);
  for (const scenario of scenarios(fixtures)) {
    total += 1;
    let result;
    try {
      result = await scenario.run();
    } catch (error) {
      result = { ok: false, detail: `threw: ${error.message}` };
    }
    if (!result.ok) failures += 1;
    console.log(
      `${result.ok ? "OK  " : "KO  "} ${scenario.name}\n     ${result.detail}`,
    );
  }
} catch (error) {
  failures += 1;
  console.error("Setup failed:", error.message ?? error);
} finally {
  await cleanup();
}
console.log(
  `\n${total - failures}/${total} scenarios passed. Test data removed.`,
);
process.exit(failures === 0 ? 0 : 1);
