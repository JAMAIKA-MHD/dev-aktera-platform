/**
 * What each plan allows. The active-campaign limit is enforced on the server (trigger
 * `enforce_active_campaign_limit`); the monthly entries are display only for now.
 */
export type PlanKey = "free" | "starter" | "pro" | "enterprise";

/**
 * Most campaigns an organization can have active at once (published and not ended), on
 * every plan. Must match `c_max_active_campaigns` in `enforce_active_campaign_limit`.
 */
export const MAX_ACTIVE_CAMPAIGNS = 5;

export interface PlanAllowance {
  label: string;
  entriesPerMonth: number;
  /** null: unlimited. */
  activeCampaigns: number | null;
}

export const PLAN_ALLOWANCES: Record<PlanKey, PlanAllowance> = {
  free: {
    label: "Free",
    entriesPerMonth: 1000,
    activeCampaigns: MAX_ACTIVE_CAMPAIGNS,
  },
  starter: {
    label: "Starter",
    entriesPerMonth: 3000,
    activeCampaigns: MAX_ACTIVE_CAMPAIGNS,
  },
  pro: {
    label: "Pro",
    entriesPerMonth: 10000,
    activeCampaigns: MAX_ACTIVE_CAMPAIGNS,
  },
  enterprise: {
    label: "Enterprise",
    entriesPerMonth: 100000,
    activeCampaigns: MAX_ACTIVE_CAMPAIGNS,
  },
};
