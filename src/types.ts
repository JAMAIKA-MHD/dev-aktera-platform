/**
 * DZEngage Platform Core Type Declarations
 * Adapted for extreme ease of GitHub Copilot & LLM integration with existing backend code bases.
 *
 * Maps 1:1 to standard SQL/NoSQL schemas:
 * - organizations
 * - profiles
 * - campaigns
 * - prizes
 * - prize_templates
 * - prize_template_items
 * - prize_inventory
 * - quiz_questions
 * - entries
 * - coupon_redemptions
 * - billing
 */

import type { ExperienceConfig } from "./features/player-experience";

export type TabType =
  | "home"
  | "campaigns"
  | "creator"
  | "prizes"
  | "inventory"
  | "analytics"
  | "billing"
  | "account"
  | "playerScreen"
  | "support";

/**
 * 1. Organizations Entity
 * Each client company subscribing to DZEngage
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  billingPlanId: string;
}

/**
 * 2. Profiles Entity
 * Operator user account linked to an organization
 */
export interface Profile {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  role: "admin" | "operator";
  createdAt: string;
}

/**
 * 3. Prize Templates Entity (prize_templates)
 * Reusable master reward library at the organization level.
 * Stored independently of individual campaigns.
 */
export interface PrizeTemplate {
  id: string;
  name: string;
  category: "voucher" | "physical";
  description: string;
  totalStock: number; // Computed from prize_template_items count
  availableStock: number; // Ready & unallocated to active campaigns
  allocatedStock: number; // Reserved/committed to current campaign prize instances
  itemValue: string; // Presentation value e.g. "500 DA", "5 GB Pass", "Soda Bottle"
  filledValuesCount?: number; // Number of per-unit values/IDs already prepared in stock room
  campaignUsageCount?: number; // Number of campaign prize rows using this template
  quantityWonCount?: number; // Number of winning units historically consumed from this template
  image?: string;
  createdAt?: string;
}

/**
 * 4. Prize Template Items Entity (prize_template_items)
 * Holds actual individual pre-uploaded coupon keys or voucher tokens.
 */
export interface PrizeTemplateItem {
  id: string;
  templateId: string;
  codeValue: string; // Actual secret code string (e.g. "XYZ-987-A1B")
  isRedeemed: boolean; // True if given to a player
  assignedEntryId?: string; // Linked player entry on win
  redeemedAt?: string;
}

/**
 * 5. Prize Inventory Quotas Entity (prize_inventory)
 * Atomic locked state of stock assigned to active campaigns.
 */
export interface PrizeInventory {
  id: string;
  campaignId: string;
  templateId: string;
  allocatedQty: number; // Max quantity allocated to this campaign
  wonQty: number; // Number of times won in this campaign
}

/**
 * 6. Quiz Questions Entity (quiz_questions)
 * Trivia setup assigned to quiz campaigns.
 */
export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
}

/**
 * 7. Campaigns Entity (campaigns)
 * Main campaign lifecycle config.
 */
export interface Campaign {
  id: string;
  organizationId?: string;
  name: string;
  arabicName: string;
  heroImageUrl?: string;
  slug: string;
  gameType: "lucky_wheel" | "quiz" | "scratch_card" | "mystery_box" | "hit_it";
  gameLogicConfig?: any;
  status: "active" | "paused" | "draft" | "archived";
  winProbability: number; // Server-enforced winning percentage (0 to 100)
  maxEntries?: "1" | "2" | "unlimited";
  prizes: {
    id?: string;
    templateId: string;
    quantity: number; // Allocated amount
    quantity_won?: number; // Units already won/claimed
    weight: number; // Spin probability weights
  }[];
  questions: QuizQuestion[];
  participantsCount: number;
  rewardsClaimed: number;
  startDate: string;
  endDate: string;
  autoPacePrizes?: boolean;
  autoPaceEnabledAt?: string | null;
  parentCampaignId?: string; // Lineage pointer for updates or relaunch flows
  playerScreenConfig?: PlayerScreenConfig;
  createdAt?: string;
}

export interface FormFieldConfig {
  id: string;
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "select";
  required: boolean;
  options?: string[]; // for select
}

export interface PlayerScreenConfig {
  // New versioned configuration of the player screens (Player Experience module).
  // Replaces uiProject, which is obsolete and removed in phase 7.
  experience?: ExperienceConfig;
  uiProject?: any;
  theme?: {
    logoUrl?: string;
    faviconUrl?: string;
    showBrandWatermark: boolean;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    background: {
      type: "solid" | "gradient" | "image" | "mesh" | "dots" | "brandImage";
      value: string;
    };
    fontFamily: string;
    customFontUrl?: string;
    borderRadius: "sharp" | "rounded" | "pill";
    modalShadow?: boolean;
    mode: "light" | "dark";
  };
  gameAssets?: {
    wheel?: {
      slices: { color: string; label: string; icon?: string }[];
      centerPinImageUrl?: string;
    };
    scratchCard?: {
      surfaceImageUrl: string;
      revealCanvasConfig: Record<string, unknown>;
    };
    matchGame?: {
      tileIcons: string[];
      gridBackgroundUrl?: string;
      popAnimation: string;
    };
    sound: {
      spinTickUrl?: string;
      matchSuccessUrl?: string;
      grandPrizeUrl?: string;
      muted: boolean;
    };
  };
  content?: {
    preGame: {
      title: string;
      subHeader: string;
      rulesText: string;
      formFields: FormFieldConfig[];
    };
    winState: { title: string; ctaLabel: string; ctaAction: string };
    loseState: { title: string; ctaLabel: string; ctaAction: string };
    gameParams: { timerSeconds: number; dailyAttempts: number };
  };
}

/**
 * 8. Entries / Leads Entity (entries)
 * Recorded player participations.
 * Server enforces duplicate checks on phone numbers per campaign.
 */
export interface LeadEntry {
  id: string;
  campaignId: string;
  campaignName: string;
  playerName: string;
  phoneNumber: string; // Algerian format: e.g. 0555123456, 0661123456
  prizeWon?: string; // Name of prize won
  prizeTemplateId?: string; // ID of the template given
  couponCode?: string; // Plucked secret code value from prize_template_items
  timestamp: string;
  consentGiven: boolean; // GDPR/Algerian local law compliance indicator
  status: "pending" | "confirmed"; // Confirmed means player acknowledges coupon copying
}

/**
 * 9. Coupon Redemptions Log Entity (coupon_redemptions)
 * Audit trail when physical merchants or validation servers scan & redeem a coupon code.
 */
export interface CouponRedemption {
  id: string;
  entryId: string;
  couponCode: string;
  validatedByMerchantId?: string;
  redeemedAt: string;
}

/**
 * 10. Billing Setup Entity
 * Tracks active limits & tiers
 */
export interface BillingPlan {
  id: string;
  tier: "starter" | "growth" | "enterprise";
  maxActiveCampaigns: number;
  campaignCount: number;
  maxEntriesPerMonth: number;
  entryCount: number;
  priceAmount: number;
}

/**
 * 11. Campaign Dashboard Analytics
 * Payload of the `get_campaign_dashboard_analytics` RPC (one campaign).
 * Rates are null when their denominator is zero (nothing to measure yet).
 */
export interface CampaignDailyPoint {
  date: string; // YYYY-MM-DD in the analytics timezone
  entries: number;
  winners: number;
}

export interface CampaignPrizeDailyWins {
  date: string; // YYYY-MM-DD in the analytics timezone
  prize_id: string | null;
  prize_name: string;
  wins: number;
}

export interface CampaignPrizeStock {
  id: string;
  name: string;
  quantity: number;
  quantity_won: number;
  remaining: number;
  burn_rate_percentage: number | null;
}

export interface CampaignOsDistribution {
  android: number;
  ios: number;
  desktop: number;
  other: number;
}

export interface CampaignLocationCount {
  location: string; // Raw wilaya / city label captured on the entry
  count: number;
}

export interface CampaignHourlyPoint {
  hour: number; // 0-23
  entries: number;
  winners: number;
}

export interface CampaignWeekdayPoint {
  weekday: number; // ISO: 1 = Monday ... 7 = Sunday
  entries: number;
  winners: number;
}

export interface CampaignDashboardAnalytics {
  campaign: {
    id: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
  };
  timezone: string;
  total_entries: number;
  total_wins: number;
  win_rate: number | null;
  avg_dwell_time_seconds: number | null;
  total_impressions: number;
  completed_impressions: number;
  completion_rate: number | null;
  prize_burn_rate: {
    total_quantity: number;
    total_won: number;
    remaining: number;
    percentage: number | null;
  };
  prizes: CampaignPrizeStock[];
  os_distribution: CampaignOsDistribution;
  participants_over_time: CampaignDailyPoint[];
  prize_distribution: CampaignPrizeDailyWins[];
  location_distribution: CampaignLocationCount[];
  location_unknown_count: number;
  hourly_distribution: CampaignHourlyPoint[];
  weekday_distribution: CampaignWeekdayPoint[];
}

/**
 * 12. Campaign Analytics Report
 * Payload of the `get_campaign_analytics_report` RPC: the dashboard analytics
 * plus the organization and the participant list, used to build the exported report.
 */
export interface CampaignReportParticipant {
  id: string;
  participant_name: string | null;
  phone_number: string | null;
  is_winner: boolean;
  prize_name: string | null;
  quiz_passed: boolean | null;
  redeemed_coupon_value: string | null;
  coupon_confirmed: boolean;
  dwell_time_seconds: number;
  location: string | null;
  submitted_at: string; // YYYY-MM-DD HH:mm in the analytics timezone
}

export interface CampaignAnalyticsReport {
  generated_at: string; // YYYY-MM-DD HH:mm in the analytics timezone
  organization: { id: string; name: string } | null;
  analytics: CampaignDashboardAnalytics;
  participants: CampaignReportParticipant[]; // Most recent first, capped at participants_limit
  participants_total: number;
  participants_limit: number;
}

/**
 * 13. Program Analytics
 * Payload of the `get_program_analytics` RPC: every campaign of the organization, over a
 * period. Rates are null when their denominator is zero (nothing to measure yet).
 */
export interface ProgramCampaignStatusCounts {
  total: number;
  active: number;
  paused: number;
  draft: number;
  ended: number;
  archived: number;
}

export interface ProgramLeaderboardRow {
  campaign_id: string;
  campaign_name: string;
  status: string;
  game_type: Campaign["gameType"];
  start_date: string | null;
  end_date: string | null;
  entries: number;
  rewards: number; // Prizes won
  impressions: number;
  completed_impressions: number;
  completion_rate: number | null;
  new_participants: number; // First seen in this campaign
  returning_participants: number; // Already seen in an earlier campaign
}

export interface ProgramMechanicRow {
  game_type: Campaign["gameType"];
  campaigns: number;
  entries: number;
  rewards: number;
  impressions: number;
  completed_impressions: number;
  completion_rate: number | null;
}

export interface ProgramDecaySeries {
  campaign_id: string;
  campaign_name: string;
  launch_date: string; // YYYY-MM-DD, the day of the campaign's first entry
  entries: number; // Entries in the period
  points: number[]; // Entries per day; index 0 is the launch day
}

export interface ProgramStockRisk {
  template_id: string;
  name: string;
  category: string;
  risk: "out" | "critical" | "warning";
  total_stock: number;
  won: number;
  remaining: number;
  remaining_percentage: number;
  burn_rate_percentage: number; // Share of the stock already won
  wins_per_day: number; // Over the last 7 days
  days_left: number | null; // At that pace; null when nothing was won recently
  active_campaigns: number;
}

export interface ProgramAnalytics {
  timezone: string;
  period: { from: string | null; to: string | null };
  totals: {
    entries: number;
    prizes_distributed: number;
    impressions: number;
    completed_impressions: number;
    completion_rate: number | null;
  };
  campaign_status: ProgramCampaignStatusCounts;
  leaderboard: ProgramLeaderboardRow[]; // Most entries first
  mechanics: ProgramMechanicRow[];
  decay_curve: ProgramDecaySeries[];
  audience: {
    unique_audience: number;
    new_participants: number;
    returning_participants: number;
    repeat_participants: number; // Played 2+ campaigns
    repeat_participation_rate: number | null;
  };
  stock_risk: ProgramStockRisk[]; // Most urgent first
  stock_templates_tracked: number;
  plan_usage: {
    plan: "free" | "starter" | "pro" | "enterprise";
    entries_this_month: number;
    active_campaigns: number;
  };
  os_distribution: CampaignOsDistribution;
  location_distribution: CampaignLocationCount[];
  location_unknown_count: number;
  hourly_distribution: CampaignHourlyPoint[];
  weekday_distribution: CampaignWeekdayPoint[];
}

/**
 * 14. Reward Analytics
 * Payload of the `get_reward_analytics` RPC: where the reward stock stands, by type and by
 * reward. A unit of stock is won, reserved (committed to a draft, active or paused campaign,
 * not won yet) or unallocated; `remaining` is reserved + unallocated.
 */
export type RewardCategory = "physical" | "voucher";

export interface RewardStockCounts {
  total_stock: number;
  won: number;
  reserved: number;
  unallocated: number;
  remaining: number;
  won_in_period: number;
}

export interface RewardTypeStock extends RewardStockCounts {
  category: RewardCategory;
  rewards: number;
  at_risk: number;
  out_of_stock: number;
  codes_loaded: number; // Voucher codes entered for the units in stock
  codes_missing: number; // Voucher units with no code yet
}

export interface RewardStockRow extends RewardStockCounts {
  template_id: string;
  name: string;
  category: RewardCategory;
  risk: "out" | "critical" | "warning" | null;
  remaining_percentage: number | null; // null when the reward has no stock
  wins_per_day: number; // Over the last 7 days
  days_left: number | null; // At that pace; null when nothing was won recently
  active_campaigns: number;
  codes_missing: number;
}

export interface RewardAnalytics {
  timezone: string;
  period: { from: string | null; to: string | null };
  totals: RewardStockCounts & {
    rewards: number;
    at_risk: number;
    out_of_stock: number;
    codes_missing: number;
  };
  by_type: RewardTypeStock[]; // Physical first, then vouchers
  rewards: RewardStockRow[]; // Most urgent first
}

/**
 * Payload of the `get_reward_stock_usage` RPC: how fast the stock of every reward, or of one
 * type, was used, day by day. The stock left on a past day is rebuilt from today's stock
 * plus everything won since. Per-type fields are null for the type not selected.
 */
export interface RewardStockUsagePoint {
  date: string; // YYYY-MM-DD in the analytics timezone
  used: number; // Units won that day
  remaining: number; // Stock left at the end of the day
  physical_used: number | null;
  voucher_used: number | null;
  physical_remaining: number | null;
  voucher_remaining: number | null;
}

export interface RewardStockUsage {
  timezone: string;
  category: RewardCategory | null; // null: every reward
  period: { from: string; to: string };
  summary: {
    total_stock: number;
    remaining: number; // Left now
    remaining_at_start: number; // Left when the period started
    used_in_period: number;
    used_percentage: number | null; // Of remaining_at_start; null when there was none
    used_per_day: number; // Average over the period
    recent_used_per_day: number; // Over the last 7 days
    days_left: number | null; // At the last 7 days' pace; null when nothing was used
  };
  daily: RewardStockUsagePoint[];
}

/**
 * 15. Billing Usage Analytics
 * Payload of the `get_billing_usage_analytics` RPC: what the organization used of its plan.
 * The allowance of each plan is in `lib/planAllowances.ts`.
 */
export interface BillingDailyUsage {
  date: string; // YYYY-MM-DD in the analytics timezone
  entries: number | null; // null on days still to come
  cumulative: number | null;
}

export interface BillingMonthlyUsage {
  month: string; // YYYY-MM
  entries: number;
  winners: number;
  campaigns: number; // Campaigns that received entries that month
  is_current: boolean;
}

export interface BillingCampaignUsage {
  campaign_id: string;
  campaign_name: string;
  status: string;
  entries: number;
}

export interface BillingPayment {
  id: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  billing_cycle: "monthly" | "yearly" | "one_time";
  amount: number;
  status: "pending" | "paid" | "failed" | "refunded";
  period_start: string; // YYYY-MM-DD
  period_end: string;
}

export interface BillingUsageAnalytics {
  timezone: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  current_month: {
    month: string; // YYYY-MM
    today: string; // YYYY-MM-DD
    days_in_month: number;
    days_elapsed: number;
    entries: number;
    entries_last_month: number;
    projected_entries: number; // Month total at the average daily pace so far
    active_campaigns: number; // Published and not ended: what the limit of 5 counts
  };
  daily_usage: BillingDailyUsage[]; // Every day of the current month
  monthly_usage: BillingMonthlyUsage[]; // Oldest first
  usage_by_campaign: BillingCampaignUsage[]; // This month, most entries first
  subscription: (Omit<BillingPayment, "id"> & { days_left: number }) | null;
  payments: BillingPayment[]; // Most recent first
  total_paid: number;
}

// --- CLIENT SIDE PLAYERS PRESETS & SIMULATORS STATE ---

export interface BrandPreset {
  id?: string;
  name: string;
  arabicName: string;
  primaryColor: string;
  secondaryColor?: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
  logoUrl?: string;
  slogan?: string;
  arabicSlogan?: string;
  prizes: Prize[];
}

export type ScreenType = "landing" | "game" | "result";

export interface PlayerData {
  name: string;
  phone: string;
  email?: string;
  consent: boolean;
}

export interface Prize {
  id?: string;
  name: string;
  icon: string;
  isWin: boolean;
  color?: string;
  textColor?: string;
  couponCode?: string;
}

/**
 * Client support tickets (table `support_tickets`).
 * A client is an organization: `organizationId` is the client id. The account details
 * (email, phone, plan) are the ones the account had when the ticket was opened.
 */
export type SupportPlatformSection =
  | "campaign_creation"
  | "analytics"
  | "inventory"
  | "player_screen_editor"
  | "other";

export type SupportTicketType =
  "platform_error" | "platform_slowness" | "other";

export type SupportSeverity = "low" | "medium" | "high" | "urgent";

export type SupportTicketState =
  "new" | "open" | "on_hold" | "cancelled" | "resolved";

export interface SupportTicket {
  id: string;
  ticketNumber: number;
  organizationId: string;
  contactEmail: string;
  contactPhone: string | null;
  plan: "free" | "starter" | "pro" | "enterprise";
  platformSection: SupportPlatformSection;
  type: SupportTicketType;
  severity: SupportSeverity;
  description: string;
  state: SupportTicketState;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** How many comments the thread of the ticket holds. */
  commentsCount: number;
}

/**
 * A comment on a ticket (table `support_ticket_comments`): written by a member of the client, or
 * by the support team (`authorType: "support"`) answering.
 */
export interface SupportTicketComment {
  id: string;
  ticketId: string;
  /** The profile that wrote it; null when the account is gone, or for the support team. */
  authorId: string | null;
  authorName: string;
  authorType: "client" | "support";
  body: string;
  createdAt: string;
}
