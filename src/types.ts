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

export type TabType =
  | "home"
  | "campaigns"
  | "creator"
  | "prizes"
  | "inventory"
  | "analytics"
  | "billing"
  | "account";

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
  type: "lucky_wheel" | "quiz";
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
  createdAt?: string;
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
