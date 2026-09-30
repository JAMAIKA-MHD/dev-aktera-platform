// Writes the Player Studio seed rows: voucher template and codes, then per campaign its row,
// prize, stock, quiz questions, fictitious participants (with their codes) and Studio design.
import { must } from "./seedStudioCleanup.mjs";
import {
  CAMPAIGNS,
  CODES,
  PRIZE_NAME,
  PRIZE_QUANTITY,
  TEMPLATE_ID,
  campaignId,
  gameLogicConfig,
  isoIn,
  participantsOf,
  prizeId,
  questionId,
  slugOf,
} from "./seedStudioData.mjs";
import { loadDesignBuilders, seedDesign } from "./seedStudioDesigns.mjs";
import { QUESTIONS } from "./seedStudioQuestions.mjs";

async function insertCodes(admin, org) {
  await must(
    "template",
    admin.from("prize_templates").insert({
      id: TEMPLATE_ID,
      organization_id: org,
      name: PRIZE_NAME,
      category: "voucher",
      stock_quantity: CODES,
    }),
  );
  const codes = Array.from({ length: CODES }, (_, i) => ({
    prize_template_id: TEMPLATE_ID,
    organization_id: org,
    item_index: i + 1,
    item_value: `SEED-${String(i + 1).padStart(3, "0")}`,
  }));
  return must(
    "codes",
    admin
      .from("prize_template_items")
      .insert(codes)
      .select("id, item_value, item_index")
      .order("item_index"),
  );
}

async function insertCampaign(admin, org, c, winners, now) {
  const id = campaignId(c.n);
  await must(
    `campaign ${c.n}`,
    admin.from("campaigns").insert({
      id,
      organization_id: org,
      name: c.name,
      arabic_name: c.arabicName,
      slug: slugOf(c.name),
      status: c.status,
      start_date: isoIn(c.start, now),
      end_date: isoIn(c.end, now),
      win_probability: 0.5,
      max_entries: 1,
      require_quiz: c.game === "quiz",
      auto_pace_prizes: false,
      game_type: c.game,
      game_logic_config: gameLogicConfig(c.game),
    }),
  );
  await must(
    `prize ${c.n}`,
    admin.from("prizes").insert({
      id: prizeId(c.n),
      campaign_id: id,
      organization_id: org,
      prize_template_id: TEMPLATE_ID,
      name: PRIZE_NAME,
      quantity: PRIZE_QUANTITY,
      quantity_won: winners,
      weight: 1,
      is_active: true,
      win_message: "You won a 500 DA voucher!",
    }),
  );
  await must(
    `stock ${c.n}`,
    admin.from("prize_inventory").insert({
      prize_id: prizeId(c.n),
      campaign_id: id,
      organization_id: org,
      initial_quantity: PRIZE_QUANTITY,
      remaining: PRIZE_QUANTITY - winners,
      claimed: winners,
    }),
  );
  if (c.game === "quiz") {
    await must(
      `questions ${c.n}`,
      admin.from("quiz_questions").insert(
        QUESTIONS.map((q, k) => ({
          id: questionId(c.n, k),
          campaign_id: id,
          organization_id: org,
          question: q.text,
          options: q.options,
          correct_option_index: q.correct,
          position: k + 1,
          is_active: true,
        })),
      ),
    );
  }
  return id;
}

// Participants, and for each winner the next free code (entry + coupon_redemptions row).
async function insertParticipants(admin, org, c, id, people, takeCode) {
  if (!people.length) return;
  const rows = people.map((p) => ({ p, code: p.isWinner ? takeCode() : null }));
  const inserted = await must(
    `entries ${c.n}`,
    admin
      .from("entries")
      .insert(
        rows.map(({ p, code }) => ({
          campaign_id: id,
          organization_id: org,
          phone_number: p.phone,
          participant_name: "Seed player",
          is_winner: p.isWinner,
          prize_id: p.isWinner ? prizeId(c.n) : null,
          redeemed_coupon_value: code?.item_value ?? null,
          quiz_passed: c.game === "quiz" ? p.isWinner : null,
          dwell_time_seconds: p.dwell,
          created_at: p.createdAt,
          metadata: {
            source: "studio_seed",
            consent: {
              accepted: true,
              acceptedAt: p.createdAt,
              policyVersion: "2026-09-01",
            },
          },
        })),
      )
      .select("id, phone_number"),
  );
  const entryOf = new Map(inserted.map((e) => [e.phone_number, e.id]));
  const redemptions = rows
    .filter((r) => r.code)
    .map(({ p, code }) => ({
      entry_id: entryOf.get(p.phone),
      prize_template_item_id: code.id,
      coupon_value: code.item_value,
    }));
  if (redemptions.length)
    await must(
      `coupons ${c.n}`,
      admin.from("coupon_redemptions").insert(redemptions),
    );
}

export async function createSeed(admin, org, now) {
  const codes = await insertCodes(admin, org);
  let next = 0;
  const takeCode = () => codes[next++];
  const builders = await loadDesignBuilders();
  for (const c of CAMPAIGNS) {
    const people = participantsOf(c, now);
    const id = await insertCampaign(
      admin,
      org,
      c,
      people.filter((p) => p.isWinner).length,
      now,
    );
    await insertParticipants(admin, org, c, id, people, takeCode);
    if (c.savedAgo !== null) {
      const savedAt = new Date(now - c.savedAgo).toISOString();
      await must(
        `design ${c.n}`,
        admin.from("campaign_experiences").insert({
          campaign_id: id,
          organization_id: org,
          config: seedDesign(builders, c, id, savedAt),
          updated_at: savedAt,
        }),
      );
    }
  }
}
