#!/usr/bin/env node
// Local seed for trying the Player Studio campaigns table (task S5, plan §7 bis).
//
//   npm run studio:seed                      (re)create the seed data in studio.test's organization
//   npm run studio:seed -- --email <email>   another local account's organization
//                                            (PowerShell drops a bare "--": write '--')
//   npm run studio:seed:clean                remove every seed row, nothing else
//
// Additive and replayable: 14 campaigns (5eed… ids, seed-… slugs) with prizes, voucher codes,
// quiz questions, fictitious participants and 8 Studio designs built by the Player Experience
// module itself. It never touches other rows, never runs supabase/seed.sql, never resets the
// database. Local stack only: it refuses to run against any other URL.
import { createClient } from "@supabase/supabase-js";

import { must, removeSeed } from "./seedStudioCleanup.mjs";
import { CAMPAIGNS, slugOf } from "./seedStudioData.mjs";
import { createSeed } from "./seedStudioRows.mjs";

const url = (process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!["http://127.0.0.1:54321", "http://localhost:54321"].includes(url)) {
  console.error(
    `Refusing to run: VITE_SUPABASE_URL is "${url}", not the local stack.`,
  );
  process.exit(2);
}
if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(2);
}

const args = process.argv.slice(2);
const clean = args.includes("--clean");
const email = args.includes("--email")
  ? args[args.indexOf("--email") + 1]
  : "studio.test@octoreach.local";
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function organizationOf(address) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error(`list users: ${error.message}`);
  const user = data.users.find(
    (u) => u.email?.toLowerCase() === address?.toLowerCase(),
  );
  if (!user) throw new Error(`No local account "${address}".`);
  const profile = await must(
    "profile",
    admin.from("profiles").select("organization_id").eq("id", user.id).single(),
  );
  if (!profile.organization_id) {
    throw new Error(`"${address}" has no organization.`);
  }
  return profile.organization_id;
}

try {
  const org = clean ? null : await organizationOf(email);
  await removeSeed(admin);
  if (clean) {
    console.log(
      "Seed data removed (5eed… campaigns, their prizes, codes, participants, designs).",
    );
  } else {
    await createSeed(admin, org, Date.now());
    console.log(
      `Seeded ${CAMPAIGNS.length} campaigns in the organization of ${email}:`,
    );
    for (const c of CAMPAIGNS) {
      const design = c.savedAgo === null ? "default" : c.preset;
      console.log(
        `  ${slugOf(c.name).padEnd(44)} ${c.status.padEnd(7)} ${String(c.players).padStart(3)} players  design: ${design}`,
      );
    }
    console.log(
      `Sign in as ${email} → Player Studio. Remove with: npm run studio:seed:clean`,
    );
  }
} catch (error) {
  console.error(
    `Seed failed: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(1);
}
