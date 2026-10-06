// Data of the Player Studio seed (scripts/studio/seed-studio-campaigns.mjs).
// Every id starts with the 5eed prefix and every slug with "seed-": the seed only ever
// touches its own rows (rules §6 bis, SD2).

export const TEMPLATE_ID = "5eed0000-0000-4000-8000-000000000001";
const seedId = (group, n) =>
  `5eed0000-0000-4000-${group}-${String(n).padStart(12, "0")}`;
export const campaignId = (n) => seedId("8001", n);
export const prizeId = (n) => seedId("8002", n);
export const questionId = (n, k) => seedId("8003", n * 10 + k);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// One line per campaign:
// [n, name, game, database status, start day, end day, participants, design saved … ago, theme]
// Days are relative to now. "ended" is the database status the dashboard shows as Archived.
// A null "saved ago" means the Studio design was never saved (the table shows "Default").
// prettier-ignore
const ROWS = [
  [1, "Summer Spin", "lucky_wheel", "active", -10, 20, 42, 30 * 1000, "midnight-gold"],
  [2, "Culture Quiz", "quiz", "active", -5, 25, 18, 2 * HOUR, "obsidian-violet"],
  [3, "Scratch & Win", "scratch_card", "active", -3, 30, 7, null, null],
  [4, "Mystery Gifts", "mystery_box", "active", -1, 40, 0, 3 * DAY, "telecom-red"],
  [5, "Hit the Target", "hit_it", "active", -8, 12, 25, null, null],
  [6, "Back to School", "lucky_wheel", "active", -40, -2, 60, 21 * DAY, "retail-blue"],
  [7, "Ramadan Nights", "quiz", "active", -90, -60, 33, 60 * DAY, "midnight-gold"],
  [8, "Weekend Flash", "scratch_card", "paused", -4, 10, 12, null, null],
  [9, "Loyalty Boxes", "mystery_box", "paused", -20, 30, 3, DAY, "clean-light"],
  [10, "New Year Draft", "lucky_wheel", "draft", 60, 90, 0, null, null],
  [11, "Hit It Draft", "hit_it", "draft", 20, 50, 0, 5 * HOUR, "telecom-red"],
  [12, "Spring Wheel 2026", "lucky_wheel", "ended", -200, -150, 51, 120 * DAY, "obsidian-violet"],
  [13, "Old Trivia", "quiz", "ended", -300, -250, 20, null, null],
  [14, "Very long campaign name to check truncation in the table", "scratch_card", "active", -2, 14, 9, null, null],
];

export const CAMPAIGNS = ROWS.map(
  ([n, name, game, status, start, end, players, savedAgo, preset]) => ({
    n,
    name: `Seed · ${name}`,
    arabicName: n === 7 ? "ليالي رمضان" : null,
    game,
    status,
    start,
    end,
    players,
    savedAgo,
    preset,
  }),
);

export const PRIZE_QUANTITY = 20;
// The database refuses allocating more than the template stock: 14 prizes × 20 ≤ 300.
export const CODES = 300;
export const WINNER_EVERY = 4; // one participant in four won
// Short: the prize name also labels the wheel segments (14 characters at most).
export const PRIZE_NAME = "Seed 500 DA";

export function slugOf(name) {
  return `seed-${name
    .replace(/^Seed · /, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)}`;
}

export function gameLogicConfig(game) {
  if (game === "quiz") return { pass_threshold_percentage: 100 };
  if (game === "hit_it") return { win_threshold: 5 };
  if (game !== "lucky_wheel") return {};
  const segment = (label, prize) => ({
    label,
    prize_template_id: prize ? TEMPLATE_ID : null,
  });
  return {
    segments: [
      segment("Voucher", true),
      segment("Try again", false),
      segment("Voucher", true),
      segment("So close", false),
    ],
  };
}

export function isoIn(days, now) {
  return new Date(now + days * DAY).toISOString();
}

// Fictitious participants: phones 0699 NN SSSS (never real numbers used in tests), spread
// between the campaign start and the earliest of its end and now.
export function participantsOf(campaign, now) {
  const from = now + campaign.start * DAY;
  const to = Math.min(now + campaign.end * DAY, now - 60 * 1000);
  const count = campaign.players;
  return Array.from({ length: count }, (_, index) => {
    const at = count > 1 ? from + ((to - from) * index) / (count - 1) : to;
    const n = String(campaign.n).padStart(2, "0");
    return {
      phone: `0699${n}${String(index + 1).padStart(4, "0")}`,
      isWinner: (index + 1) % WINNER_EVERY === 0,
      createdAt: new Date(Math.max(from, at)).toISOString(),
      dwell: 8 + ((index * 7) % 30),
    };
  });
}
