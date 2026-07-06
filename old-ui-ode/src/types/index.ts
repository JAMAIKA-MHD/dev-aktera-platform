/**
 * DZENGAGE — Domain Type Definitions
 * ===================================
 * Central TypeScript interfaces describing every entity in the B2B
 * gamification platform. These mirror the PostgreSQL tables defined in
 * `src/lib/schema.sql` and are used throughout the app for type-safe
 * database access, form handling, and component props.
 *
 * Naming convention: each interface is the singular PascalCase form of its
 * backing table (e.g. table `organizations` → interface `Organization`).
 */

/* ------------------------------------------------------------------ */
/* Organization                                                        */
/* ------------------------------------------------------------------ */

/**
 * Represents a company/tenant on the DZENGAGE platform.
 *
 * Each organization is the top-level isolation boundary: all campaigns,
 * prizes, entries, and billing records belong to exactly one organization.
 * RLS policies use `organization_id` to scope every child table so that
 * members of one org can never read or mutate another org's data.
 */
export interface Organization {
  /** Primary key (uuid). */
  id: string;
  /** Human-readable company name, shown in dashboards and invoices. */
  name: string;
  /** URL-safe unique identifier used in public-facing links (e.g. /play/:slug). */
  slug: string;
  /** Contact email for the organization's primary administrator. */
  contact_email: string;
  /** Contact phone number (Algerian format, e.g. +213XXXXXXXXX). */
  phone_number: string | null;
  /** Optional brand/logo URL for white-labeling the player experience. */
  logo_url: string | null;
  /** Current subscription tier: 'free' | 'starter' | 'pro' | 'enterprise'. */
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  /** Whether the org is allowed to log in (soft-disable without deleting data). */
  is_active: boolean;
  /** ISO timestamp of record creation. */
  created_at: string;
  /** ISO timestamp of the last modification. */
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

/**
 * A user account belonging to an organization.
 *
 * One organization may have many profiles (admins, campaign managers,
 * analysts). The `role` field drives UI permissions and RLS policy
 * conditions. This table joins 1:1 with Supabase `auth.users` via `id`.
 */
export interface Profile {
  /** Primary key — also the foreign key to `auth.users.id`. */
  id: string;
  /** Organization this user belongs to (tenant scoping). */
  organization_id: string;
  /** Full display name shown in the UI. */
  full_name: string;
  /** Login email (mirrors auth.users.email; stored here for fast joins). */
  email: string;
  /** Permission level within the org: 'owner' | 'admin' | 'manager' | 'viewer'. */
  role: 'owner' | 'admin' | 'manager' | 'viewer';
  /** Optional avatar image URL. */
  avatar_url: string | null;
  /** ISO timestamp of record creation. */
  created_at: string;
  /** ISO timestamp of the last modification. */
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Campaign                                                            */
/* ------------------------------------------------------------------ */

/**
 * A gamification campaign owned by an organization.
 *
 * A campaign is the central object: it has a time window (`start_date` /
 * `end_date`), a configurable `win_probability` that determines the chance
 * any given play wins a prize, and a `status` lifecycle. Players interact
 * with a campaign through the public `/play/:slug` route, which creates
 * `Entry` records and may award `Prize` records via `PrizeInventory`.
 */
export interface Campaign {
  /** Primary key (uuid). */
  id: string;
  /** Owning organization (tenant scoping). */
  organization_id: string;
  /** Display name shown in the dashboard and on the player landing page. */
  name: string;
  /** URL-safe unique identifier for the public play route. */
  slug: string;
  /** Optional reference to the campaign this one was derived from for update/republish history. */
  source_campaign_id: string | null;
  /** Short marketing description shown to players. */
  description: string | null;
  /** Lifecycle state: 'draft' | 'active' | 'paused' | 'ended' | 'archived'. */
  status: 'draft' | 'active' | 'paused' | 'ended' | 'archived';
  /** ISO date when the campaign becomes playable. */
  start_date: string;
  /** ISO date when the campaign stops accepting entries. */
  end_date: string;
  /**
   * Probability (0–1) that a single play wins any prize.
   * e.g. 0.25 means 25% of entries win. The actual prize is chosen
   * from the campaign's `prize_inventory` weighted by remaining stock.
   */
  win_probability: number;
  /** Maximum number of entries allowed (null = unlimited). */
  max_entries: number | null;
  /** Whether a phone number is required to submit an entry. */
  require_phone: boolean;
  /** Whether a quiz must be answered correctly to be eligible to win. */
  require_quiz: boolean;
  /** Optional background/hero image URL for the player page. */
  hero_image_url: string | null;
  /** Brand color (hex) used to theme the player experience. */
  theme_color: string | null;
  /** ISO timestamp of record creation. */
  created_at: string;
  /** ISO timestamp of the last modification. */
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* PrizeTemplate                                                       */
/* ------------------------------------------------------------------ */

/**
 * A reusable prize definition that an organization can stock across many
 * campaigns (e.g. "1000 DA Voucher", "Smartphone", "T-shirt").
 *
 * Templates decouple the *catalog* of prizes from the *inventory* allocated
 * to a specific campaign. This lets admins build a library once and reuse it.
 */
export interface PrizeTemplate {
  /** Primary key (uuid). */
  id: string;
  /** Owning organization (tenant scoping). */
  organization_id: string;
  /** Display name of the prize (e.g. "1000 DA Recharge"). */
  name: string;
  /** Longer description shown to players when they win. */
  description: string | null;
  /** Category for grouping/filtering: 'voucher' | 'physical'. */
  category: 'voucher' | 'physical';
  /** Retail/face value in DZD (Algerian Dinar) for reporting and analytics. */
  value: number;
  /** Total stock prepared at template level, independent from campaigns. */
  stock_quantity: number;
  /** Optional image URL representing the prize. */
  image_url: string | null;
  /** ISO timestamp of record creation. */
  created_at: string;
  /** ISO timestamp of the last modification. */
  updated_at: string;
}

export interface PrizeTemplateItem {
  id: string;
  prize_template_id: string;
  organization_id: string;
  item_index: number;
  item_value: string | null;
  source_type: 'manual' | 'bulk';
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Prize                                                               */
/* ------------------------------------------------------------------ */

/**
 * A prize *allocated* to a specific campaign, drawn from a `PrizeTemplate`.
 *
 * While `PrizeTemplate` is the reusable catalog entry, `Prize` is the
 * per-campaign instance carrying its own `quantity`, `weight` (for the
 * weighted random draw), and `win_message`. The public player route reads
 * active campaign prizes to render the roulette wheel segments.
 */
export interface Prize {
  /** Primary key (uuid). */
  id: string;
  /** Campaign this prize is attached to. */
  campaign_id: string;
  /** Owning organization (tenant scoping, denormalized for simpler policies). */
  organization_id: string;
  /** Reference to the reusable template this prize is based on. */
  prize_template_id: string;
  /** Display name (copied from template at allocation time, editable per campaign). */
  name: string;
  /** Per-campaign description shown on the wheel/winner screen. */
  description: string | null;
  /** Image URL for the wheel segment and winner modal. */
  image_url: string | null;
  /** Total number of units allocated to this campaign. */
  quantity: number;
  /** How many units have already been won (decremented on each winning entry). */
  quantity_won: number;
  /**
   * Relative weight for the weighted random draw among the campaign's prizes.
   * Higher weight = more likely to be selected when a play wins.
   */
  weight: number;
  /** Probability (0–1) of winning *this specific* prize, shown in analytics. */
  probability: number;
  /** Custom message shown to the player when they win this prize. */
  win_message: string | null;
  /** Whether this prize is currently eligible to be drawn. */
  is_active: boolean;
  /** ISO timestamp of record creation. */
  created_at: string;
  /** ISO timestamp of the last modification. */
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* PrizeInventory                                                      */
/* ------------------------------------------------------------------ */

/**
 * Tracks real-time stock for a prize within a campaign.
 *
 * `Prize.quantity` / `quantity_won` give the aggregate view, but
 * `PrizeInventory` holds the authoritative, atomic stock counter used by
 * the draw logic to avoid overselling. Each winning entry decrements
 * `remaining` inside a transaction/RLS-guarded update.
 */
export interface PrizeInventory {
  /** Primary key (uuid). */
  id: string;
  /** The prize this inventory row tracks. */
  prize_id: string;
  /** Campaign this inventory belongs to (denormalized for fast filtering). */
  campaign_id: string;
  /** Owning organization (tenant scoping). */
  organization_id: string;
  /** Total units originally stocked. */
  initial_quantity: number;
  /** Units remaining and still drawable. Must never go below 0. */
  remaining: number;
  /** Units already won/claimed. Equals initial_quantity - remaining. */
  claimed: number;
  /** ISO timestamp of record creation. */
  created_at: string;
  /** ISO timestamp of the last modification (every draw updates this). */
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* PrizeInventoryItem                                                  */
/* ------------------------------------------------------------------ */

export interface PrizeInventoryItem {
  id: string;
  prize_inventory_id: string;
  prize_id: string;
  campaign_id: string;
  organization_id: string;
  item_index: number;
  item_value: string | null;
  source_type: 'manual' | 'bulk';
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* QuizQuestion                                                        */
/* ------------------------------------------------------------------ */

/**
 * A multiple-choice question attached to a campaign.
 *
 * When `Campaign.require_quiz` is true, a player must answer all linked
 * questions correctly before their entry is eligible for the prize draw.
 * Questions are ordered by `position` for deterministic display.
 */
export interface QuizQuestion {
  /** Primary key (uuid). */
  id: string;
  /** Campaign this question belongs to. */
  campaign_id: string;
  /** Owning organization (tenant scoping). */
  organization_id: string;
  /** The question text shown to the player. */
  question: string;
  /** Ordered list of answer options (2–6). */
  options: string[];
  /** Index into `options` of the correct answer (0-based). */
  correct_option_index: number;
  /** Optional explanation shown after answering. */
  explanation: string | null;
  /** Display order within the quiz (ascending). */
  position: number;
  /** Whether this question is currently active in the quiz. */
  is_active: boolean;
  /** ISO timestamp of record creation. */
  created_at: string;
  /** ISO timestamp of the last modification. */
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

/**
 * A single play/entry submitted by a participant in a campaign.
 *
 * Entries are created from the public player route (no auth required), so
 * the `entries` table has a public INSERT policy. To prevent abuse, a
 * unique constraint on `(campaign_id, phone_number)` ensures one entry
 * per phone per campaign when `require_phone` is set. The `is_winner`
 * flag and `prize_id` link the entry to any prize awarded.
 */
export interface Entry {
  /** Primary key (uuid). */
  id: string;
  /** Campaign this entry was submitted against. */
  campaign_id: string;
  /** Owning organization (tenant scoping, denormalized for org dashboards). */
  organization_id: string;
  /** Participant's phone number (required when campaign.require_phone = true). */
  phone_number: string | null;
  /** Participant's name, if collected by the campaign form. */
  participant_name: string | null;
  /** Participant's email, if collected by the campaign form. */
  participant_email: string | null;
  /** Whether the participant answered the quiz correctly (null if no quiz). */
  quiz_passed: boolean | null;
  /** Whether this entry won a prize. */
  is_winner: boolean;
  /** The prize won, if any (foreign key to prizes.id). */
  prize_id: string | null;
  /** The coupon/voucher code given to the winner, if any. */
  redeemed_coupon_value: string | null;
  /** Whether the winner confirmed they received/copied the coupon. */
  coupon_confirmed: boolean;
  /** Free-text feedback or opt-in answers from the participant. */
  metadata: Record<string, unknown> | null;
  /** IP address of the submitter (for fraud/abuse analysis). */
  ip_address: string | null;
  /** User-agent string of the submitter's browser. */
  user_agent: string | null;
  /** ISO timestamp of submission. */
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Billing                                                             */
/* ------------------------------------------------------------------ */

/**
 * A billing/subscription record for an organization.
 *
 * One row per billing period (or per one-time purchase). Ties into the
 * organization's `plan` and tracks payment status for invoicing and
 * access gating. The `stripe_*` fields support future Stripe integration.
 */
export interface Billing {
  /** Primary key (uuid). */
  id: string;
  /** Organization this billing record belongs to. */
  organization_id: string;
  /** The plan this billing record grants: 'free' | 'starter' | 'pro' | 'enterprise'. */
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  /** Billing cadence: 'monthly' | 'yearly' | 'one_time'. */
  billing_cycle: 'monthly' | 'yearly' | 'one_time';
  /** Amount charged in DZD. */
  amount: number;
  /** Payment status: 'pending' | 'paid' | 'failed' | 'refunded'. */
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  /** Stripe customer ID (for future Stripe integration). */
  stripe_customer_id: string | null;
  /** Stripe invoice/charge ID (for future Stripe integration). */
  stripe_invoice_id: string | null;
  /** ISO date the billing period starts. */
  period_start: string;
  /** ISO date the billing period ends. */
  period_end: string;
  /** ISO timestamp of record creation. */
  created_at: string;
  /** ISO timestamp of the last modification. */
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* PrizeSelectionResult                                                */
/* ------------------------------------------------------------------ */

/**
 * The result of the prize-draw algorithm for a single entry.
 *
 * This is a *computed* type (not a table) returned by the draw utility /
 * edge function. It tells the caller whether the entry won, which prize
 * was selected, and why — including the "no prize" case so the UI can
 * show a consistent outcome regardless of win/lose.
 */
export interface PrizeSelectionResult {
  /** Whether the entry won any prize. */
  is_winner: boolean;
  /** The selected prize, or null if the entry did not win. */
  prize: Prize | null;
  /** The prize template backing the selected prize (for display details). */
  prize_template: PrizeTemplate | null;
  /** Remaining inventory of the selected prize after this draw (0 if no win). */
  remaining_inventory: number;
  /** Human-readable reason for the outcome (useful for logs/debugging). */
  reason: 'won' | 'lost_probability' | 'no_inventory' | 'quiz_failed' | 'campaign_inactive';
  /** The random value (0–1) that was rolled against win_probability. */
  roll: number;
}
