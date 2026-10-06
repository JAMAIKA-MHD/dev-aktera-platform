// Every dashboard URL in one place: pages and links build their paths here, never by hand.
import type { TabType } from "../types";

// The Studio route also opens the demo experience, not tied to any campaign.
export const STANDALONE_STUDIO = "standalone";

export const PATHS = {
  home: "/",
  campaigns: "/campaigns",
  campaign: (id: string) => `/campaigns/${id}`,
  create: "/create",
  edit: (id: string) => `/create/${id}/edit`,
  relaunch: (id: string) => `/create/${id}/relaunch`,
  prizes: "/prizes",
  analytics: "/analytics",
  analyticsFor: (id: string) => `/analytics/${id}`,
  billing: "/billing",
  account: "/account",
  studio: "/studio",
  studioFor: (id: string) => `/studio/${id}`,
} as const;

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
    case "playerScreen":
      return PATHS.studio;
    default:
      return PATHS.home;
  }
}
