/**
 * What each plan allows. Display only for now: nothing enforces these limits yet, on the
 * server or in the app.
 */
export type PlanKey = "free" | "starter" | "pro" | "enterprise";

export interface PlanAllowance {
  label: string;
  entriesPerMonth: number;
  /** null: unlimited. */
  activeCampaigns: number | null;
}

export const PLAN_ALLOWANCES: Record<PlanKey, PlanAllowance> = {
  free: { label: "Free", entriesPerMonth: 1000, activeCampaigns: 1 },
  starter: { label: "Starter", entriesPerMonth: 3000, activeCampaigns: 3 },
  pro: { label: "Pro", entriesPerMonth: 10000, activeCampaigns: 5 },
  enterprise: {
    label: "Enterprise",
    entriesPerMonth: 100000,
    activeCampaigns: null,
  },
};
