#!/usr/bin/env node
// Security probe of the local Supabase stack (backend tasks B1.1, B1.2, B6.2): tries, with the
// anon key only, everything a visitor must not be able to do, and checks that the public
// entry points still answer.
//
//   npm run backend:probe
//
// Optional member checks (organization isolation) run when BACKEND_PROBE_EMAIL and
// BACKEND_PROBE_PASSWORD are set (a local test account; never commit them).
//
// No check changes data: forbidden calls target ids that do not exist, or draft campaigns
// (refused before any draw), so a call that gets through fails or returns "not found" /
// "not active" instead of writing. The only rows it creates (a throwaway entry on a draft
// campaign, and an impression if its table had no foreign key) are deleted before it exits.
// Local stack only: it refuses to run against any other URL.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL ?? "";
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const LOCAL_URLS = ["http://127.0.0.1:54321", "http://localhost:54321"];

if (!LOCAL_URLS.includes(url.replace(/\/$/, ""))) {
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
const anon = createClient(url, anonKey, options);
const admin = createClient(url, serviceKey, options);
const PERMISSION_DENIED = "42501";
const PROBE_SESSION = `anon-probe-${randomUUID()}`;
const missingId = () => randomUUID();

// A call is "blocked" when Postgres refuses it for lack of rights.
const isDenied = (error) => error?.code === PERMISSION_DENIED;
const blocked = (error) => ({
  ok: isDenied(error),
  detail: error
    ? `${error.code ?? "?"} ${error.message}`
    : "no error: the call went through",
});
const reachable = (error) => ({
  ok: !isDenied(error),
  detail: error ? `${error.code ?? "?"} ${error.message}` : "OK",
});

const anonChecks = [
  {
    name: "anon cannot read entries",
    run: async () => {
      const { count, error } = await anon
        .from("entries")
        .select("id", { count: "exact", head: true });
      if (error) return { ok: true, detail: `${error.code} ${error.message}` };
      return { ok: count === 0, detail: `${count} rows visible` };
    },
  },
  {
    name: "anon cannot insert entries",
    run: async () => {
      const { error } = await anon.from("entries").insert({
        campaign_id: missingId(),
        organization_id: missingId(),
        phone_number: "0550000000",
        is_winner: true,
      });
      return blocked(error);
    },
  },
  {
    name: "anon cannot update entries",
    run: async () => {
      // A throwaway confirmed entry on a draft campaign, "updated" to the value it already
      // has: nothing changes even if the update goes through, and the row is deleted after.
      const { data: draft } = await admin
        .from("campaigns")
        .select("id, organization_id")
        .eq("status", "draft")
        .limit(1)
        .maybeSingle();
      if (!draft)
        return {
          ok: true,
          detail: "SKIP: no draft campaign to attach a probe entry to",
        };
      const { data: row, error: seedError } = await admin
        .from("entries")
        .insert({
          campaign_id: draft.id,
          organization_id: draft.organization_id,
          phone_number: `05${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
          coupon_confirmed: true,
          metadata: { anon_probe: PROBE_SESSION },
        })
        .select("id")
        .single();
      if (seedError)
        return {
          ok: false,
          detail: `could not create the probe entry: ${seedError.message}`,
        };
      try {
        const { data, error } = await anon
          .from("entries")
          .update({ coupon_confirmed: true })
          .eq("id", row.id)
          .select("id");
        if (error)
          return { ok: true, detail: `${error.code} ${error.message}` };
        return { ok: data.length === 0, detail: `${data.length} rows updated` };
      } finally {
        await admin.from("entries").delete().eq("id", row.id);
      }
    },
  },
  {
    name: "anon cannot call draw_and_claim_campaign_prize",
    run: async () =>
      blocked(
        (
          await anon.rpc("draw_and_claim_campaign_prize", {
            p_campaign_id: missingId(),
            p_quiz_passed: null,
          })
        ).error,
      ),
  },
  {
    name: "anon cannot call resolve_game_outcome",
    run: async () =>
      blocked(
        (
          await anon.rpc("resolve_game_outcome", {
            p_campaign_id: missingId(),
            p_payload: {},
          })
        ).error,
      ),
  },
  {
    name: "anon cannot call claim_campaign_prize_coupon",
    run: async () =>
      blocked(
        (
          await anon.rpc("claim_campaign_prize_coupon", {
            p_prize_id: missingId(),
            p_entry_id: missingId(),
          })
        ).error,
      ),
  },
  {
    name: "anon cannot call save_campaign_full_in_place",
    run: async () =>
      blocked(
        (
          await anon.rpc("save_campaign_full_in_place", {
            p_campaign_id: missingId(),
            p_organization_id: missingId(),
            p_name: "anon-probe",
            p_slug: `anon-probe-${randomUUID()}`,
            p_prizes: [], // refused by the function's own validation if the call got through
          })
        ).error,
      ),
  },
  {
    name: "anon cannot call get_campaign_participants",
    run: async () =>
      blocked(
        (
          await anon.rpc("get_campaign_participants", {
            p_organization_id: null,
            p_campaign_id: null,
          })
        ).error,
      ),
  },
  {
    name: "anon cannot call get_campaign_analytics_v2",
    run: async () =>
      blocked(
        (
          await anon.rpc("get_campaign_analytics_v2", {
            p_organization_id: null,
            p_campaign_id: null,
          })
        ).error,
      ),
  },
  {
    name: "anon can still call record_campaign_impression",
    run: async () =>
      reachable(
        (
          await anon.rpc("record_campaign_impression", {
            p_campaign_id: missingId(),
            p_session_id: PROBE_SESSION,
            p_user_agent: "anon-probe",
            p_ip_address: null,
            p_dwell_time_seconds: 0,
            p_game_played: false,
            p_form_completed: false,
          })
        ).error,
      ),
  },
  {
    name: "anon can still call select-prize",
    run: async () => {
      // Missing campaign: select-prize answers 404 without writing anything. An auth error
      // (401/403) would mean the function is no longer public.
      let response;
      try {
        response = await fetch(`${url}/functions/v1/select-prize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          // A valid request (consent included, B2.1) on a campaign that does not exist.
          body: JSON.stringify({
            campaign_id: missingId(),
            phone_number: "0550000000",
            metadata: {
              consent: {
                accepted: true,
                acceptedAt: new Date().toISOString(),
                policyVersion: "anon-probe",
              },
            },
          }),
        });
      } catch (error) {
        return {
          ok: true,
          detail: `SKIP: functions not served (${error.message})`,
        };
      }
      if (response.status === 503 || response.status === 502) {
        return {
          ok: true,
          detail: `SKIP: functions not served (HTTP ${response.status})`,
        };
      }
      return { ok: response.status === 404, detail: `HTTP ${response.status}` };
    },
  },
  // B1.2: the design table and the public read.
  {
    name: "anon get_public_experience answers without secret fields",
    run: async () => {
      const { data: published } = await admin
        .from("campaigns")
        .select("slug")
        .not("status", "in", "(draft,archived)")
        .limit(1)
        .maybeSingle();
      if (!published)
        return { ok: true, detail: "SKIP: no published campaign" };
      const { data, error } = await anon.rpc("get_public_experience", {
        p_slug: published.slug,
      });
      if (error) return { ok: false, detail: `${error.code} ${error.message}` };
      const leaked = [...keysOf(data)].filter((key) =>
        SECRET_KEYS.includes(key),
      );
      return {
        ok: data?.found === true && leaked.length === 0,
        detail: leaked.length
          ? `leaks: ${leaked.join(", ")}`
          : `found, keys: ${Object.keys(data).join(", ")}`,
      };
    },
  },
  {
    name: "anon get_public_experience hides drafts and unknown slugs",
    run: async () => {
      const { data: draft } = await admin
        .from("campaigns")
        .select("slug")
        .eq("status", "draft")
        .limit(1)
        .maybeSingle();
      const slugs = [
        `anon-probe-${randomUUID()}`,
        ...(draft ? [draft.slug] : []),
      ];
      for (const slug of slugs) {
        const { data, error } = await anon.rpc("get_public_experience", {
          p_slug: slug,
        });
        if (error)
          return { ok: false, detail: `${error.code} ${error.message}` };
        if (data?.found !== false)
          return { ok: false, detail: `${slug}: ${JSON.stringify(data)}` };
      }
      return { ok: true, detail: `found: false for ${slugs.length} slugs` };
    },
  },
  {
    name: "anon cannot call save_experience_config",
    run: async () =>
      blocked(
        (
          await anon.rpc("save_experience_config", {
            p_campaign_id: missingId(),
            p_config: {},
            p_expected_updated_at: null,
          })
        ).error,
      ),
  },
  {
    name: "anon cannot read campaign_experiences",
    run: async () => {
      const { data, error } = await anon
        .from("campaign_experiences")
        .select("campaign_id");
      if (error) return { ok: true, detail: `${error.code} ${error.message}` };
      return { ok: data.length === 0, detail: `${data.length} rows visible` };
    },
  },
  // B6.2: the public page reads get_public_experience only; the tables stay closed to anon.
  ...[
    ["quiz_questions", "correct_option_index"],
    ["prizes", "weight"],
    ["campaigns", "win_probability"],
  ].map(([table, column]) => ({
    name: `anon cannot read ${table}.${column}`,
    run: async () => {
      const { data, error } = await anon.from(table).select(`id, ${column}`);
      if (error) return { ok: true, detail: `${error.code} ${error.message}` };
      return { ok: data.length === 0, detail: `${data.length} rows visible` };
    },
  })),
];

// What get_public_experience must never return, at any depth.
const SECRET_KEYS = [
  "correct_option_index",
  "weight",
  "quantity",
  "quantity_won",
  "win_probability",
  "max_entries",
  "organization_id",
  "coupon",
  "item_value",
];
function* keysOf(value) {
  if (Array.isArray(value)) {
    for (const item of value) yield* keysOf(item);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      yield key;
      yield* keysOf(child);
    }
  }
}

// Organization isolation, as a signed-in member (optional).
async function memberChecks() {
  const email = process.env.BACKEND_PROBE_EMAIL;
  const password = process.env.BACKEND_PROBE_PASSWORD;
  if (!email || !password) return [];
  const member = createClient(url, anonKey, options);
  const { data: login, error } = await member.auth.signInWithPassword({
    email,
    password,
  });
  if (error)
    return [
      {
        name: "member can sign in",
        run: async () => ({ ok: false, detail: error.message }),
      },
    ];
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", login.user.id)
    .single();
  const ownOrg = profile?.organization_id;
  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id, organization_id, status");
  // Draft campaigns only: draw_and_claim_campaign_prize refuses them before any draw, so a
  // call that gets through never claims stock ("Campaign is not active." vs "not found").
  const ownDraft = campaigns?.find(
    (c) => c.organization_id === ownOrg && c.status === "draft",
  );
  const foreign = campaigns?.find(
    (c) => c.organization_id !== ownOrg && c.status === "draft",
  );

  return [
    {
      name: "member reads the entries of their organization only",
      run: async () => {
        const { data, error: readError } = await member
          .from("entries")
          .select("organization_id");
        if (readError) return { ok: false, detail: readError.message };
        const others = data.filter(
          (row) => row.organization_id !== ownOrg,
        ).length;
        return {
          ok: others === 0,
          detail: `${data.length} rows, ${others} from another organization`,
        };
      },
    },
    {
      name: "member draw_and_claim_campaign_prize reaches own campaigns",
      run: async () => {
        if (!ownDraft)
          return {
            ok: true,
            detail: "SKIP: no draft campaign in the member's organization",
          };
        // A draft campaign is refused before any draw: nothing is claimed.
        const { data, error: drawError } = await member.rpc(
          "draw_and_claim_campaign_prize",
          {
            p_campaign_id: ownDraft.id,
            p_quiz_passed: null,
          },
        );
        if (drawError) return { ok: false, detail: drawError.message };
        return {
          ok: data?.error === "Campaign is not active.",
          detail: JSON.stringify(data),
        };
      },
    },
    {
      name: "member draw_and_claim_campaign_prize cannot reach another organization",
      run: async () => {
        if (!foreign)
          return {
            ok: true,
            detail: "SKIP: no draft campaign in another organization",
          };
        const { data, error: drawError } = await member.rpc(
          "draw_and_claim_campaign_prize",
          {
            p_campaign_id: foreign.id,
            p_quiz_passed: null,
          },
        );
        if (drawError) return { ok: true, detail: drawError.message };
        return {
          ok: data?.error === "Campaign not found.",
          detail: JSON.stringify(data),
        };
      },
    },
    {
      name: "member cannot insert entries for another organization",
      run: async () => {
        if (!foreign)
          return {
            ok: true,
            detail: "SKIP: no campaign in another organization",
          };
        const { error: insertError } = await member.from("entries").insert({
          campaign_id: missingId(),
          organization_id: foreign.organization_id,
          phone_number: "0550000000",
        });
        return blocked(insertError);
      },
    },
    {
      name: "member get_campaign_participants is limited to their organization",
      run: async () => {
        const { data, error: rpcError } = await member.rpc(
          "get_campaign_participants",
          {
            p_organization_id: null,
            p_campaign_id: null,
          },
        );
        if (rpcError) return { ok: false, detail: rpcError.message };
        const ownCampaigns = new Set(
          campaigns
            .filter((c) => c.organization_id === ownOrg)
            .map((c) => c.id),
        );
        const others = data.filter(
          (row) => !ownCampaigns.has(row.campaign_id),
        ).length;
        return {
          ok: others === 0,
          detail: `${data.length} rows, ${others} from another organization`,
        };
      },
    },
    // B1.2: saving a design.
    {
      name: "member saves a design with optimistic concurrency",
      run: async () => {
        if (!ownDraft)
          return {
            ok: true,
            detail: "SKIP: no draft campaign in the member's organization",
          };
        const { data: existing } = await admin
          .from("campaign_experiences")
          .select("campaign_id")
          .eq("campaign_id", ownDraft.id)
          .maybeSingle();
        // Never overwrite a real design.
        if (existing)
          return { ok: true, detail: "SKIP: this draft already has a design" };
        const save = (expected) =>
          member.rpc("save_experience_config", {
            p_campaign_id: ownDraft.id,
            p_config: { probe: PROBE_SESSION },
            p_expected_updated_at: expected,
          });
        try {
          const first = await save(null);
          const firstAt = first.data?.config?.updatedAt;
          const second = await save(firstAt);
          const stale = await save(firstAt);
          const steps = [first, second, stale].map(
            (r) =>
              r.error?.message ?? r.data?.code ?? (r.data?.ok ? "ok" : "?"),
          );
          const { data: row } = await admin
            .from("campaign_experiences")
            .select("organization_id, updated_by, config")
            .eq("campaign_id", ownDraft.id)
            .single();
          return {
            ok:
              steps.join(",") === "ok,ok,CONFLICT" &&
              row.organization_id === ownOrg &&
              row.updated_by === login.user.id &&
              row.config.campaignId === ownDraft.id,
            detail: `first, second, stale → ${steps.join(", ")}`,
          };
        } finally {
          await admin
            .from("campaign_experiences")
            .delete()
            .eq("campaign_id", ownDraft.id);
        }
      },
    },
    {
      name: "member cannot save a design for another organization",
      run: async () => {
        if (!foreign)
          return {
            ok: true,
            detail: "SKIP: no draft campaign in another organization",
          };
        const { data, error: saveError } = await member.rpc(
          "save_experience_config",
          {
            p_campaign_id: foreign.id,
            p_config: { probe: PROBE_SESSION },
            p_expected_updated_at: null,
          },
        );
        if (saveError) return { ok: false, detail: saveError.message };
        return { ok: data?.code === "NOT_FOUND", detail: JSON.stringify(data) };
      },
    },
    {
      name: "member cannot attach a design to the wrong organization",
      run: async () => {
        if (!ownDraft || !foreign)
          return {
            ok: true,
            detail: "SKIP: needs a draft in each organization",
          };
        const attempts = [
          // Another organization's campaign, filed under the member's organization.
          { campaign_id: foreign.id, organization_id: ownOrg },
          // The member's campaign, filed under another organization.
          {
            campaign_id: ownDraft.id,
            organization_id: foreign.organization_id,
          },
        ];
        for (const attempt of attempts) {
          const { error: insertError } = await member
            .from("campaign_experiences")
            .insert({ ...attempt, config: { probe: PROBE_SESSION } });
          if (!isDenied(insertError)) {
            await admin
              .from("campaign_experiences")
              .delete()
              .eq("campaign_id", attempt.campaign_id)
              .eq("config->>probe", PROBE_SESSION);
            return {
              ok: false,
              detail: `went through: ${JSON.stringify(attempt)}`,
            };
          }
        }
        return { ok: true, detail: "42501 for both attempts" };
      },
    },
    {
      name: "member cannot read another organization's design",
      run: async () => {
        if (!foreign)
          return {
            ok: true,
            detail: "SKIP: no draft campaign in another organization",
          };
        const { data: existing } = await admin
          .from("campaign_experiences")
          .select("campaign_id")
          .eq("campaign_id", foreign.id)
          .maybeSingle();
        if (!existing) {
          await admin.from("campaign_experiences").insert({
            campaign_id: foreign.id,
            organization_id: foreign.organization_id,
            config: { probe: PROBE_SESSION },
          });
        }
        try {
          const { data, error: readError } = await member
            .from("campaign_experiences")
            .select("campaign_id")
            .eq("campaign_id", foreign.id);
          if (readError) return { ok: true, detail: readError.message };
          return {
            ok: data.length === 0,
            detail: `${data.length} rows visible`,
          };
        } finally {
          if (!existing)
            await admin
              .from("campaign_experiences")
              .delete()
              .eq("campaign_id", foreign.id);
        }
      },
    },
  ];
}

const checks = [...anonChecks, ...(await memberChecks())];
let failures = 0;
console.log(`Security probe — ${url}\n`);
for (const check of checks) {
  let result;
  try {
    result = await check.run();
  } catch (error) {
    result = { ok: false, detail: `threw: ${error.message}` };
  }
  if (!result.ok) failures += 1;
  console.log(
    `${result.ok ? "OK  " : "KO  "} ${check.name.padEnd(68)} ${result.detail}`,
  );
}

// Cleanup: an impression row can only exist if campaign_impressions has no foreign key.
await admin
  .from("campaign_impressions")
  .delete()
  .eq("session_id", PROBE_SESSION);

console.log(`\n${checks.length - failures}/${checks.length} checks passed.`);
process.exit(failures === 0 ? 0 : 1);
