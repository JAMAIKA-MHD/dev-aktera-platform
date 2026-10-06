// The dashboard's shared data and actions, loaded once for every page under the shell and the
// Studio: campaigns, reward templates, entries, and the writes that change them. Pages read it
// with `useDashboard()`; what a page decides on its own (where to go next) stays in the page.
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../contexts/AuthContext";
import { useCampaigns } from "../hooks/useCampaigns";
import { useEntries } from "../hooks/useEntries";
import { usePrizeTemplates } from "../hooks/usePrizeTemplates";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import {
  addPrizeTemplateService,
  archiveCampaignService,
  createOrUpdateCampaignFullService,
  deleteCampaignService,
  deletePrizeTemplateService,
  updateCampaignStatusService,
  updatePrizeTemplateService,
  updatePrizeTemplateStockService,
} from "../services/campaignService";
import type { Campaign, LeadEntry, PrizeTemplate } from "../types";

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDRIrzL2B44jQOBHs_8Mr5_T7olxzgM6b1g4gWw22aervyasCXua96W9EMGfBs3Hbv_9zNL7W6q68Dap-kyXlJCTapI9qT3WCgI9tFHlCAB92gCphYgPX17Qnu4U6HxnVUGbl8sbA-ULs79sQ5zlbr2TisGtCtC1Qmq1DEjMvqaAg-AbaNcSw2caRxs0HgZ7kySWhAeALg1mGqNgflVBbIxNxh8gNLhxlFARs8RHBYpYaBpFsMgMw-h";

type NewPrizeTemplate = Omit<
  PrizeTemplate,
  "id" | "allocatedStock" | "availableStock"
>;

export type CampaignDraft = Omit<
  Campaign,
  "participantsCount" | "rewardsClaimed"
> & {
  mode?: "create" | "edit" | "relaunch" | "update";
  submitStatus?: "draft" | "active";
};

const ORG_NOT_LOADED = "Organization not loaded. Please refresh the page.";

export interface DashboardData {
  orgId: string | null;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;

  campaigns: Campaign[];
  campLoading: boolean;
  campError: string | null;
  refetchCampaigns: () => Promise<void> | void;

  prizes: PrizeTemplate[];
  prizeLoading: boolean;
  refetchPrizes: () => Promise<void> | void;

  leads: LeadEntry[];

  /** CRUD failure shown in the shell's banner. */
  actionError: string | null;
  setActionError: (message: string | null) => void;

  addPrize: (prize: NewPrizeTemplate) => Promise<void>;
  updatePrize: (id: string, updates: NewPrizeTemplate) => Promise<void>;
  deletePrize: (id: string) => Promise<void>;
  updateStock: (id: string, amount: number) => Promise<void>;

  /** Creates or updates a campaign; throws (and flags the banner) when it is refused. */
  persistCampaign: (draft: CampaignDraft) => Promise<void>;
  toggleCampaignStatus: (id: string) => Promise<void>;
  archiveCampaign: (id: string) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardData | null>(null);

export function useDashboard(): DashboardData {
  const value = useContext(DashboardContext);
  if (!value) {
    throw new Error("useDashboard must be used inside <DashboardProvider>");
  }
  return value;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { organization, profile } = useAuth();
  const orgId = organization?.id ?? null;

  const [avatarUrl, setAvatarUrl] = useState<string>(
    () => localStorage.getItem("user-avatar-preview") || DEFAULT_AVATAR,
  );
  useEffect(() => {
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    else if (organization?.logo_url) setAvatarUrl(organization.logo_url);
  }, [profile?.avatar_url, organization?.logo_url]);

  const {
    campaigns,
    loading: campLoading,
    error: campError,
    refetch: refetchCampaigns,
  } = useCampaigns(orgId);
  const {
    prizes,
    loading: prizeLoading,
    refetch: refetchPrizes,
  } = usePrizeTemplates(orgId);
  const { entries: leads } = useEntries(orgId);

  const [actionError, setActionError] = useState<string | null>(null);

  const value = useMemo<DashboardData>(() => {
    const addPrize = async (newPrize: NewPrizeTemplate) => {
      if (!orgId) throw new Error(ORG_NOT_LOADED);
      setActionError(null);
      await addPrizeTemplateService(newPrize, orgId);
      refetchPrizes();
    };

    const updatePrize = async (id: string, updates: NewPrizeTemplate) => {
      if (!orgId) throw new Error(ORG_NOT_LOADED);
      setActionError(null);
      const existing = prizes.find((p) => p.id === id);
      if (!existing) throw new Error("Reward template could not be found.");
      if (updates.totalStock < existing.allocatedStock) {
        throw new Error(
          `Reward stock cannot go below the reserved quantity (${existing.allocatedStock}) already allocated to campaigns.`,
        );
      }
      await updatePrizeTemplateService(id, updates);
      refetchPrizes();
    };

    const deletePrize = async (id: string) => {
      if (!orgId) throw new Error(ORG_NOT_LOADED);
      setActionError(null);
      const existing = prizes.find((p) => p.id === id);
      if (!existing) throw new Error("Reward template could not be found.");
      if ((existing.campaignUsageCount ?? 0) > 0) {
        throw new Error(
          "This reward template is already used in campaigns and cannot be deleted.",
        );
      }
      await deletePrizeTemplateService(id);
      refetchPrizes();
    };

    const updateStock = async (id: string, amount: number) => {
      setActionError(null);
      const template = prizes.find((p) => p.id === id);
      if (!template) throw new Error("Reward template could not be found.");
      const newTotal = Math.max(0, template.totalStock + amount);
      if (newTotal < template.allocatedStock) {
        const message = `Reward stock cannot go below the reserved quantity (${template.allocatedStock}) already allocated to campaigns.`;
        setActionError(message);
        throw new Error(message);
      }
      try {
        await updatePrizeTemplateStockService(id, newTotal);
        refetchPrizes();
      } catch (err) {
        const message = toFriendlyErrorMessage(err, "Failed to update stock.");
        setActionError(message);
        throw new Error(message);
      }
    };

    const persistCampaign = async (draft: CampaignDraft) => {
      if (!orgId) {
        const message =
          "Organization not loaded. Please refresh the page and try again.";
        setActionError(message);
        throw new Error(message);
      }
      setActionError(null);
      const result = await createOrUpdateCampaignFullService(
        {
          orgId,
          newCamp: draft,
          submitStatus: draft.submitStatus ?? draft.status,
        },
        prizes,
      );
      if (!result.success) {
        const message =
          result.errors && result.errors.length > 0
            ? result.errors.map((e) => e.message).join(" ")
            : "Failed to save campaign.";
        setActionError(message);
        throw new Error(message);
      }
    };

    const toggleCampaignStatus = async (id: string) => {
      setActionError(null);
      const campaign = campaigns.find((c) => c.id === id);
      if (!campaign) return;
      try {
        await updateCampaignStatusService(
          id,
          campaign.status === "active" ? "paused" : "active",
        );
        refetchCampaigns();
      } catch (err) {
        setActionError(
          toFriendlyErrorMessage(err, "Failed to update campaign status."),
        );
      }
    };

    const archiveCampaign = async (id: string) => {
      setActionError(null);
      try {
        await archiveCampaignService(id);
        refetchCampaigns();
      } catch (err) {
        setActionError(
          toFriendlyErrorMessage(err, "Failed to archive campaign."),
        );
      }
    };

    const deleteCampaign = async (id: string) => {
      setActionError(null);
      try {
        const target = campaigns.find((campaign) => campaign.id === id);
        if (!target) throw new Error("Campaign could not be found.");
        if (target.status !== "draft" && target.status !== "archived") {
          throw new Error("Only draft or archived campaigns can be deleted.");
        }
        await deleteCampaignService(id);
        await refetchCampaigns();
      } catch (err) {
        setActionError(
          toFriendlyErrorMessage(err, "Failed to delete campaign."),
        );
      }
    };

    return {
      orgId,
      avatarUrl,
      setAvatarUrl,
      campaigns,
      campLoading,
      campError,
      refetchCampaigns,
      prizes,
      prizeLoading,
      refetchPrizes,
      leads,
      actionError,
      setActionError,
      addPrize,
      updatePrize,
      deletePrize,
      updateStock,
      persistCampaign,
      toggleCampaignStatus,
      archiveCampaign,
      deleteCampaign,
    };
    // The handlers close over the lists above: the value is rebuilt when they change.
  }, [
    orgId,
    avatarUrl,
    campaigns,
    campLoading,
    campError,
    refetchCampaigns,
    prizes,
    prizeLoading,
    refetchPrizes,
    leads,
    actionError,
  ]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
