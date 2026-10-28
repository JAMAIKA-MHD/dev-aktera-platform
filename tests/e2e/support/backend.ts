// The real local Supabase the end-to-end suite plays against: no mocked save, no mocked
// draw. It refuses to run against anything but the local stack (npx supabase start), and
// everything it creates belongs to the run's own organizations, removed afterwards.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GameType } from "./matrix";

const LOCAL_URLS = ["http://127.0.0.1:54321", "http://localhost:54321"];

function readEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return { ...env, ...(process.env as Record<string, string>) };
}

const env = readEnv();
export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!LOCAL_URLS.includes(SUPABASE_URL)) {
  throw new Error(
    `Refusing to run: VITE_SUPABASE_URL is "${SUPABASE_URL}", not the local stack.`,
  );
}
if (!ANON_KEY || !SERVICE_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY (.env.local).",
  );
}

const OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
export const admin = createClient(SUPABASE_URL, SERVICE_KEY, OPTIONS);
export const anonClient = () => createClient(SUPABASE_URL, ANON_KEY, OPTIONS);

// The key supabase-js keeps its session under, in the app's localStorage.
export const AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

const PASSWORD = "E2e-pass-12345";
const DAY = 24 * 3600 * 1000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

function must<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

export interface Member {
  userId: string;
  orgId: string;
  email: string;
  client: SupabaseClient;
  session: unknown; // what supabase-js stores, injected into the browser
}

export interface Campaign {
  id: string;
  slug: string;
  gameType: GameType;
  winning: boolean;
}

// One run's own organizations, members and campaigns, all removed by cleanup().
export class Fixture {
  readonly tag = randomUUID().slice(0, 8);
  private orgIds: string[] = [];
  private userIds: string[] = [];

  async organization(label: string): Promise<string> {
    const org = must(
      await admin
        .from("organizations")
        .insert({
          name: `e2e ${label} ${this.tag}`,
          slug: `e2e-${label}-${this.tag}`,
          contact_email: `${label}-${this.tag}@e2e.test`,
        })
        .select("id")
        .single(),
      "organization",
    ) as { id: string };
    this.orgIds.push(org.id);
    return org.id;
  }

  async member(orgId: string, label: string): Promise<Member> {
    const email = `${label}-${this.tag}@e2e.test`;
    const user = must(
      await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      }),
      "user",
    ).user!;
    this.userIds.push(user.id);
    must(
      await admin.from("profiles").insert({
        id: user.id,
        organization_id: orgId,
        full_name: label,
        email,
        role: "admin",
      }),
      "profile",
    );
    const client = createClient(SUPABASE_URL, ANON_KEY, OPTIONS);
    const login = must(
      await client.auth.signInWithPassword({ email, password: PASSWORD }),
      "sign in",
    );
    return { userId: user.id, orgId, email, client, session: login.session };
  }

  // A live campaign of one game. A winning one has a prize every play wins (the win screen,
  // a real coupon code); a losing one has none (the lose screen). Quiz questions included.
  async campaign(
    orgId: string,
    gameType: GameType,
    key: string,
    { winning = true }: { winning?: boolean } = {},
  ): Promise<Campaign> {
    const id = randomUUID();
    const slug = `e2e-${this.tag}-${key}`;
    const logic: Record<string, number> =
      gameType === "hit_it"
        ? { win_threshold: 1, hit_it_duration_seconds: 20 }
        : gameType === "quiz"
          ? { pass_threshold_percentage: 0, quiz_seconds_per_question: 20 }
          : {};
    must(
      await admin.from("campaigns").insert({
        id,
        organization_id: orgId,
        name: `e2e ${key}`,
        slug,
        status: "active",
        start_date: iso(-DAY),
        end_date: iso(DAY),
        win_probability: winning ? 1 : 0,
        max_entries: 1,
        require_quiz: false,
        auto_pace_prizes: false,
        game_type: gameType,
        game_logic_config: logic,
      }),
      "campaign",
    );
    if (winning) {
      const template = must(
        await admin
          .from("prize_templates")
          .insert({
            organization_id: orgId,
            name: `e2e ${this.tag} ${key}`,
            category: "voucher",
            stock_quantity: 50,
          })
          .select("id")
          .single(),
        "prize template",
      ) as { id: string };
      must(
        await admin.from("prize_template_items").insert(
          Array.from({ length: 10 }, (_, index) => ({
            prize_template_id: template.id,
            organization_id: orgId,
            item_index: index + 1,
            item_value: `E2E-${this.tag}-${key}-${index + 1}`,
          })),
        ),
        "coupon codes",
      );
      const prizeId = randomUUID();
      must(
        await admin.from("prizes").insert({
          id: prizeId,
          campaign_id: id,
          organization_id: orgId,
          prize_template_id: template.id,
          name: `Bon e2e ${key}`,
          quantity: 10,
          quantity_won: 0,
          weight: 1,
          is_active: true,
        }),
        "prize",
      );
      must(
        await admin.from("prize_inventory").insert({
          prize_id: prizeId,
          campaign_id: id,
          organization_id: orgId,
          initial_quantity: 10,
          remaining: 10,
          claimed: 0,
        }),
        "inventory",
      );
    }
    if (gameType === "quiz") {
      const questions: [string, string[], number][] = [
        ["Capitale de l'Algérie ?", ["Oran", "Alger", "Constantine"], 1],
        ["Couleur du ciel ?", ["Bleu", "Vert"], 0],
      ];
      must(
        await admin.from("quiz_questions").insert(
          questions.map(([question, options, correct], position) => ({
            campaign_id: id,
            organization_id: orgId,
            question,
            options,
            correct_option_index: correct,
            position,
          })),
        ),
        "quiz questions",
      );
    }
    return { id, slug, gameType, winning };
  }

  async cleanup(): Promise<void> {
    for (const orgId of this.orgIds) {
      await admin.from("entries").delete().eq("organization_id", orgId);
      await admin.from("campaigns").delete().eq("organization_id", orgId);
      await admin.from("prize_templates").delete().eq("organization_id", orgId);
      await admin.from("profiles").delete().eq("organization_id", orgId);
      await admin.from("organizations").delete().eq("id", orgId);
    }
    for (const userId of this.userIds)
      await admin.auth.admin.deleteUser(userId);
  }
}

export interface StoredDesign {
  campaign_id: string;
  template_id: string;
  config: Record<string, unknown>;
  updated_at: string;
}

// The saved design rows of a campaign, read with the service role: what is really stored.
export async function storedDesigns(
  campaignId: string,
): Promise<StoredDesign[]> {
  return must(
    await admin
      .from("campaign_experiences")
      .select("*")
      .eq("campaign_id", campaignId),
    "campaign_experiences",
  ) as StoredDesign[];
}
