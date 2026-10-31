// Every dashboard URL in one place: pages and links build their paths here, never by hand.
import type { TabType } from "../types";

// The Studio route also opens the demo experience, not tied to any campaign.
export const STANDALONE_STUDIO = "standalone";

/** The sections of the analytics page; `campaigns` is the one `/analytics` opens on. */
export const ANALYTICS_SECTIONS = ["campaigns", "rewards", "billing"] as const;
export type AnalyticsSection = (typeof ANALYTICS_SECTIONS)[number];

export const PATHS = {
  home: "/",
  campaigns: "/campaigns",
  campaign: (id: string) => `/campaigns/${id}`,
  create: "/create",
  edit: (id: string) => `/create/${id}/edit`,
  relaunch: (id: string) => `/create/${id}/relaunch`,
  prizes: "/prizes",
  prizesLocal: "/prizes/local",
  /** The codes of one reward, on a page of their own. */
  rewardCodes: (id: string) => `/prizes/local/${id}`,
  analytics: "/analytics",
  analyticsFor: (id: string) => `/analytics/${id}`,
  analyticsSection: (section: AnalyticsSection) =>
    section === "campaigns" ? "/analytics" : `/analytics?section=${section}`,
  billing: "/billing",
  account: "/account",
  support: "/support",
  studio: "/studio",
  studioFor: (id: string) => `/studio/${id}`,
} as const;

/** Router state sent with `PATHS.edit` / `PATHS.relaunch` when the wizard opens from a campaign's detail page. */
export const FROM_CAMPAIGN_DETAILS = { from: "details" } as const;

/** The URL a legacy `TabType` stands for (components that still name a tab). */
export function tabPath(tab: TabType): string {
  switch (tab) {
    case "campaigns":
      return PATHS.campaigns;
    case "creator":
      return PATHS.create;
    case "prizes":
    case "inventory":
      return PATHS.prizes;
    case "analytics":
      return PATHS.analytics;
    case "billing":
      return PATHS.billing;
    case "account":
      return PATHS.account;
    case "support":
      return PATHS.support;
    case "playerScreen":
      return PATHS.studio;
    default:
      return PATHS.home;
  }
}
