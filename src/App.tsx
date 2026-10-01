import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Campaign, PrizeTemplate, TabType } from "./types";

// B2B view subcomponents
import { DashboardHome } from "./components/DashboardHome";
import { CampaignsList } from "./components/CampaignsList";
import { CampaignWizard } from "./components/CampaignWizard";
import { CampaignWorkspace } from "./components/CampaignWorkspace";
import { PrizesManager } from "./components/PrizesManager";
import { InventoryManager } from "./components/InventoryManager";
import { AnalyticsCenter } from "./components/AnalyticsCenter";
import { BillingUsage } from "./components/BillingUsage";
import { AccountSettings } from "./components/AccountSettings";

import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { useLanguage } from "./contexts/LanguageContext";
import { useCampaigns } from "./hooks/useCampaigns";
import { usePrizeTemplates } from "./hooks/usePrizeTemplates";
import { useEntries } from "./hooks/useEntries";
import { toFriendlyErrorMessage } from "./lib/errorMessages";
import { supabase } from "./lib/supabase";
import type { StudioBackend } from "./features/player-experience";
import {
  addPrizeTemplateService,
  updatePrizeTemplateService,
  deletePrizeTemplateService,
  updatePrizeTemplateStockService,
  updateCampaignStatusService,
  archiveCampaignService,
  deleteCampaignService,
  createOrUpdateCampaignFullService,
} from "./services/campaignService";

import {
  Flame,
  LayoutDashboard,
  Sliders,
  Gift,
  BarChart3,
  Database,
  User,
  CreditCard,
  ChevronRight,
  Search,
  Smartphone,
  X,
  Check,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDRIrzL2B44jQOBHs_8Mr5_T7olxzgM6b1g4gWw22aervyasCXua96W9EMGfBs3Hbv_9zNL7W6q68Dap-kyXlJCTapI9qT3WCgI9tFHlCAB92gCphYgPX17Qnu4U6HxnVUGbl8sbA-ULs79sQ5zlbr2TisGtCtC1Qmq1DEjMvqaAg-AbaNcSw2caRxs0HgZ7kySWhAeALg1mGqNgflVBbIxNxh8gNLhxlFARs8RHBYpYaBpFsMgMw-h";

// The Player Experience Studio (T7.1), loaded on demand: the dashboard bundle does not carry it.
const CampaignStudio = lazy(() =>
  import("./features/player-experience").then((module) => ({
    default: module.CampaignStudio,
  })),
);

// The Player Studio page: the brand's campaigns in a table, before the Studio. On demand too.
const StudioCampaignsPage = lazy(() =>
  import("./components/playerStudio/StudioCampaignsPage").then((module) => ({
    default: module.StudioCampaignsPage,
  })),
);

// The Portal Simulator (T7.2): the real runtime in a phone-sized frame, loaded on demand.
const CampaignSimulator = lazy(() =>
  import("./features/player-experience").then((module) => ({
    default: module.CampaignSimulator,
  })),
);

// The Studio's campaign picker offers "standalone" (the demo campaign) besides real campaigns.
const STANDALONE_STUDIO = "standalone";

// The Studio and the sandbox save and read real campaigns' designs on Supabase (backend B4.1).
const STUDIO_BACKEND: StudioBackend = {
  client: supabase,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
};

// "Edit in campaign settings" from the Studio: the wizard step of each part of the rules.
const WIZARD_STEP = { rules: 2, prizes: 3, questions: 4 } as const;

export default function App({ initialTab = "home" }: { initialTab?: TabType }) {
  const { organization, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, isRtl } = useLanguage();
  const orgId = organization?.id ?? null;

  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return localStorage.getItem("user-avatar-preview") || DEFAULT_AVATAR;
  });

  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    } else if (organization?.logo_url) {
      setAvatarUrl(organization.logo_url);
    }
  }, [profile?.avatar_url, organization?.logo_url]);

  // Real Supabase data
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
  const { entries: leads, refetch: refetchEntries } = useEntries(orgId);

  // Action error state (shown in-dashboard for CRUD failures)
  const [actionError, setActionError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Focus & Draft states
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [relaunchDraftCampaign, setRelaunchDraftCampaign] =
    useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Campaign open in the Studio: null shows the Player Studio table. Separate from the
  // sandbox's own campaign, so that one never changes the other.
  const [studioCampaignId, setStudioCampaignId] = useState<string | null>(null);

  // Portal Simulator drawer and the campaign it plays
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [sandboxCampaignId, setSandboxCampaignId] = useState<string>("");
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
  // The campaign wizard opened over the Studio, and what to do once it closes.
  const [studioWizard, setStudioWizard] = useState<{
    campaign: Campaign;
    step: 1 | 2 | 3 | 4;
  } | null>(null);
  const studioWizardDone = useRef<(() => void) | null>(null);

  // Auto-select first loaded campaign for the sandbox
  useEffect(() => {
    if (campaigns.length > 0 && !sandboxCampaignId) {
      setSandboxCampaignId(campaigns[0].id);
    }
  }, [campaigns, sandboxCampaignId]);

  // ── Prize template handlers ────────────────────────────────────────────────

  const handleAddPrize = async (
    newPrize: Omit<PrizeTemplate, "id" | "allocatedStock" | "availableStock">,
  ) => {
    if (!orgId)
      throw new Error("Organization not loaded. Please refresh the page.");
    setActionError(null);

    await addPrizeTemplateService(newPrize, orgId);
    refetchPrizes();
  };

  const handleUpdatePrize = async (
    id: string,
    updates: Omit<PrizeTemplate, "id" | "allocatedStock" | "availableStock">,
  ) => {
    if (!orgId)
      throw new Error("Organization not loaded. Please refresh the page.");
    setActionError(null);

    const existingTemplate = prizes.find((p) => p.id === id);
    if (!existingTemplate) {
      throw new Error("Reward template could not be found.");
    }

    if (updates.totalStock < existingTemplate.allocatedStock) {
      throw new Error(
        `Reward stock cannot go below the reserved quantity (${existingTemplate.allocatedStock}) already allocated to campaigns.`,
      );
    }

    await updatePrizeTemplateService(id, updates);
    refetchPrizes();
  };

  const handleDeletePrize = async (id: string) => {
    if (!orgId)
      throw new Error("Organization not loaded. Please refresh the page.");
    setActionError(null);

    const existingTemplate = prizes.find((p) => p.id === id);
    if (!existingTemplate) {
      throw new Error("Reward template could not be found.");
    }

    if ((existingTemplate.campaignUsageCount ?? 0) > 0) {
      throw new Error(
        "This reward template is already used in campaigns and cannot be deleted.",
      );
    }

    await deletePrizeTemplateService(id);
    refetchPrizes();
  };

  const handleUpdateStock = async (id: string, amount: number) => {
    setActionError(null);
    const template = prizes.find((p) => p.id === id);
    if (!template) {
      throw new Error("Reward template could not be found.");
    }

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

  // ── Campaign CRUD handlers ─────────────────────────────────────────────────

  type CampaignDraft = Omit<
    Campaign,
    "participantsCount" | "rewardsClaimed"
  > & {
    mode?: "create" | "edit" | "relaunch" | "update";
    submitStatus?: "draft" | "active";
  };

  const handleSaveCampaign = async (newCamp: CampaignDraft) => {
    await persistCampaign(newCamp);
    setRelaunchDraftCampaign(null);
    setEditingCampaign(null);
    setSelectedCampaignId(null);
    await refetchCampaigns();
    await refetchPrizes();
    setActiveTab("campaigns");
  };

  const persistCampaign = async (newCamp: CampaignDraft) => {
    if (!orgId) {
      const msg =
        "Organization not loaded. Please refresh the page and try again.";
      setActionError(msg);
      throw new Error(msg);
    }
    setActionError(null);
    const submitStatus = newCamp.submitStatus ?? newCamp.status;

    const result = await createOrUpdateCampaignFullService(
      {
        orgId,
        newCamp,
        submitStatus,
      },
      prizes,
    );

    if (!result.success) {
      const errorMsg =
        result.errors && result.errors.length > 0
          ? result.errors.map((e) => e.message).join(" ")
          : "Failed to save campaign.";
      setActionError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // ── Player Experience Studio (T7.1) ────────────────────────────────────────

  // "Edit in campaign settings": the wizard opens over the Studio on the right step, and the
  // promise settles once it closes, after the campaign was reloaded — the Studio then shows
  // the new prizes or questions, and flags translations the change made outdated.
  const handleEditFromStudio = useCallback(
    (campaignId: string, section: keyof typeof WIZARD_STEP) =>
      new Promise<void>((resolve) => {
        const campaign = campaigns.find((item) => item.id === campaignId);
        if (!campaign) return resolve();
        studioWizardDone.current = resolve;
        setStudioWizard({ campaign, step: WIZARD_STEP[section] });
      }),
    [campaigns],
  );

  const closeStudioWizard = async () => {
    setStudioWizard(null);
    await refetchCampaigns();
    studioWizardDone.current?.();
    studioWizardDone.current = null;
  };

  const handleToggleCampaignStatus = async (id: string) => {
    setActionError(null);
    const camp = campaigns.find((c) => c.id === id);
    if (!camp) return;
    const nextStatus = camp.status === "active" ? "paused" : "active";
    try {
      await updateCampaignStatusService(id, nextStatus);
      refetchCampaigns();
    } catch (err) {
      setActionError(
        toFriendlyErrorMessage(err, "Failed to update campaign status."),
      );
    }
  };

  const handleArchiveCampaign = async (id: string) => {
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

  const handleDeleteCampaign = async (id: string) => {
    setActionError(null);
    try {
      const targetCampaign = campaigns.find((campaign) => campaign.id === id);
      if (!targetCampaign) {
        throw new Error("Campaign could not be found.");
      }

      if (!(
        targetCampaign.status === "draft" ||
        targetCampaign.status === "archived"
      )) {
        throw new Error("Only draft or archived campaigns can be deleted.");
      }

      await deleteCampaignService(id);

      if (selectedCampaignId === id) {
        setSelectedCampaignId(null);
      }
      await refetchCampaigns();
    } catch (err) {
      setActionError(toFriendlyErrorMessage(err, "Failed to delete campaign."));
    }
  };

  // Handler: Relaunch Campaign pre-fill
  const handleRelaunchTrigger = (camp: Campaign) => {
    setEditingCampaign(null);
    setRelaunchDraftCampaign(camp);
    setActiveTab("creator");
  };

  // Handler: In-place edit trigger for all campaigns
  const handleEditCampaignTrigger = (camp: Campaign) => {
    setRelaunchDraftCampaign(null);
    setEditingCampaign(camp);
    setActiveTab("creator");
  };

  // Handler: open the Studio on a campaign ("Customize player screen"); without an id (a
  // campaign not saved yet), the Player Studio table.
  const handleOpenPlayerScreenEditor = (
    camp: Campaign | { id?: string; [key: string]: any },
  ) => {
    setStudioCampaignId(camp?.id ?? null);
    setActiveTab("playerScreen");
  };

  const handleSidebarNavigate = (tab: TabType) => {
    setSelectedCampaignId(null);
    setEditingCampaign(null);
    setRelaunchDraftCampaign(null);
    setStudioCampaignId(null);
    setActiveTab(tab);
  };

  const handleCampaignFocus = (id: string) => {
    setSelectedCampaignId(id);
    setActiveTab("campaigns");
  };

  const handleOpenAnalyticsDesk = (id: string) => {
    setSelectedCampaignId(id);
    setActiveTab("analytics");
  };

  const selectedCampaign = selectedCampaignId
    ? (campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null)
    : null;

  return (
    <div
      id="saas-app-root"
      className="h-screen flex overflow-hidden bg-brand-dark font-sans text-brand-text text-sm select-none"
    >
      {/* SIDEBAR NAVIGATION (Dynamic auto-shrinking & auto-expanding on hover) */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`hidden lg:flex flex-col h-full z-20 flex-shrink-0 relative glass-panel border-r border-brand-border transition-all duration-300 ease-in-out ${
          isSidebarHovered ? "w-64" : "w-20"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3.5 border-b border-brand-border/50 overflow-hidden whitespace-nowrap">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#151E30] p-1.5 flex items-center justify-center shrink-0 shadow-md border border-brand-border/60">
            <img
              src="/aktera-logo.png"
              alt="Aktera"
              className="w-full h-full object-contain dark:invert"
            />
          </div>
          <span
            className={`font-black text-xl tracking-wider text-brand-text transition-opacity duration-200 ${
              isSidebarHovered
                ? "opacity-100"
                : "opacity-0 w-0 pointer-events-none"
            }`}
          >
            Aktera
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1.5 overflow-x-hidden">
          {[
            {
              id: "home",
              label: t("nav.overview", "Overview"),
              icon: "fa-solid fa-border-all",
            },
            {
              id: "campaigns",
              label: t("nav.campaigns", "Campaign Radios"),
              icon: "fa-solid fa-list-ul",
            },
            {
              id: "prizes",
              label: t("nav.rewards", "Reward Library"),
              icon: "fa-solid fa-gift",
            },
            {
              id: "analytics",
              label: t("nav.analytics", "Analytics Desk"),
              icon: "fa-solid fa-chart-line",
            },
            {
              id: "billing",
              label: t("nav.billing", "Billing & Quota"),
              icon: "fa-solid fa-file-invoice-dollar",
            },
            {
              id: "playerScreen",
              label: t("nav.playerScreen", "Player Studio"),
              icon: "fa-solid fa-mobile-screen",
            },
            {
              id: "account",
              label: t("nav.organization", "Organization"),
              icon: "fa-regular fa-user",
            },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSidebarNavigate(item.id as TabType)}
                title={!isSidebarHovered ? item.label : undefined}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] font-bold"
                    : "text-brand-textMuted hover:text-brand-text hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="w-6 flex items-center justify-center shrink-0 text-base">
                  <i className={item.icon}></i>
                </div>
                <span
                  className={`transition-opacity duration-200 text-sm ${
                    isSidebarHovered
                      ? "opacity-100"
                      : "opacity-0 w-0 pointer-events-none"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-brand-border/50 space-y-1.5 overflow-hidden whitespace-nowrap">
          <a
            className="flex items-center gap-3.5 px-3 py-2.5 text-brand-textMuted hover:text-brand-text text-xs transition-colors rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
            href="#"
            title={
              !isSidebarHovered
                ? t("nav.docs", "Full documentation")
                : undefined
            }
          >
            <div className="w-6 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-book"></i>
            </div>
            <span
              className={`transition-opacity duration-200 ${
                isSidebarHovered
                  ? "opacity-100"
                  : "opacity-0 w-0 pointer-events-none"
              }`}
            >
              {t("nav.docs", "Full documentation")}
            </span>
          </a>
          <button
            onClick={signOut}
            title={!isSidebarHovered ? t("nav.signOut", "Sign out") : undefined}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 text-xs transition-colors rounded-xl cursor-pointer"
          >
            <div className="w-6 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-sign-out-alt"></i>
            </div>
            <span
              className={`transition-opacity duration-200 font-bold ${
                isSidebarHovered
                  ? "opacity-100"
                  : "opacity-0 w-0 pointer-events-none"
              }`}
            >
              {t("nav.signOut", "Sign out")}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* TOPBAR */}
        <header className="h-18 sm:h-20 flex items-center justify-between px-7 z-40 shrink-0 border-b border-brand-border/20 relative">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                document
                  .getElementById("mobile-nav-bar")
                  ?.classList.toggle("hidden")
              }
              className="lg:hidden w-10 h-10 rounded-full bg-card-bg border border-brand-border flex items-center justify-center text-brand-textMuted hover:text-brand-text cursor-pointer transition-colors shadow-sm"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            {/* Interactive Player Sandbox Pill button */}
            <button
              onClick={() => setShowSandbox(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-full text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 cursor-pointer"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-pulse"></div>
              <span>Interactive Player Sandbox</span>
            </button>

            {/* Theme toggle circular button */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-card-bg border border-brand-border flex items-center justify-center text-brand-textMuted hover:text-brand-text cursor-pointer transition-all shadow-sm hover:scale-105"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <i
                className={`fa-solid ${theme === "dark" ? "fa-sun text-amber-400 text-base" : "fa-moon text-slate-700 text-base"}`}
              ></i>
            </button>

            {/* Notifications circular button */}
            <button
              className="w-10 h-10 rounded-full bg-card-bg border border-brand-border flex items-center justify-center text-brand-textMuted hover:text-brand-text cursor-pointer transition-all shadow-sm hover:scale-105"
              title="Notifications"
            >
              <i className="fa-regular fa-bell text-base"></i>
            </button>

            {/* User Avatar */}
            <div
              onClick={() => handleSidebarNavigate("account")}
              className="relative cursor-pointer hover:opacity-90 transition-opacity"
              title="Account Settings"
            >
              <img
                alt="User profile"
                className="w-10 h-10 rounded-full object-cover border border-brand-border shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                src={avatarUrl || DEFAULT_AVATAR}
              />
            </div>
          </div>
        </header>

        {/* Action error banner */}
        {actionError && (
          <div className="w-full bg-red-900/20 border-b border-red-500/30 px-6 py-2.5 flex items-center justify-between gap-3 z-20 shrink-0">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <i className="fa-solid fa-triangle-exclamation flex-shrink-0"></i>
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-300 cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* DASHBOARD CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2 z-10 scroll-smooth">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DashboardHome
                  campaigns={campaigns}
                  prizes={prizes}
                  leads={leads}
                  onNavigate={handleSidebarNavigate}
                  onSelectCampaign={handleCampaignFocus}
                  onOpenWizard={() => handleSidebarNavigate("creator")}
                />
              </motion.div>
            )}

            {activeTab === "campaigns" && (
              <motion.div
                key="campaigns"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {selectedCampaign ? (
                  <CampaignWorkspace
                    campaign={selectedCampaign}
                    prizes={prizes}
                    leads={leads}
                    onBack={() => setSelectedCampaignId(null)}
                    onEditCampaign={handleEditCampaignTrigger}
                    onCustomizePlayerScreen={handleOpenPlayerScreenEditor}
                    onRelaunch={handleRelaunchTrigger}
                    onToggleStatus={handleToggleCampaignStatus}
                    onOpenAnalytics={handleOpenAnalyticsDesk}
                  />
                ) : (
                  <CampaignsList
                    campaigns={campaigns}
                    onSelectCampaign={handleCampaignFocus}
                    onEditCampaign={handleEditCampaignTrigger}
                    onCustomizePlayerScreen={handleOpenPlayerScreenEditor}
                    onRelaunch={handleRelaunchTrigger}
                    onToggleStatus={handleToggleCampaignStatus}
                    onArchive={handleArchiveCampaign}
                    onDelete={handleDeleteCampaign}
                    onOpenAnalytics={handleOpenAnalyticsDesk}
                    onOpenWizard={() => handleSidebarNavigate("creator")}
                  />
                )}
              </motion.div>
            )}

            {activeTab === "creator" && (
              <motion.div
                key={`creator-${editingCampaign?.id ?? relaunchDraftCampaign?.id ?? "new"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CampaignWizard
                  prizes={prizes}
                  onSave={handleSaveCampaign}
                  onOpenPlayerScreenEditor={handleOpenPlayerScreenEditor}
                  onCancel={() => {
                    setEditingCampaign(null);
                    setRelaunchDraftCampaign(null);
                    setActiveTab("campaigns");
                  }}
                  relaunchDraft={relaunchDraftCampaign}
                  editingCampaign={editingCampaign}
                />
              </motion.div>
            )}

            {activeTab === "prizes" && (
              <motion.div
                key="prizes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <PrizesManager
                  prizes={prizes}
                  campaigns={campaigns}
                  organizationId={orgId}
                  onAddPrize={handleAddPrize}
                  onUpdatePrize={handleUpdatePrize}
                  onDeletePrize={handleDeletePrize}
                  onRefreshPrizes={refetchPrizes}
                />
              </motion.div>
            )}

            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AnalyticsCenter initialCampaignId={selectedCampaignId} />
              </motion.div>
            )}

            {activeTab === "billing" && (
              <motion.div
                key="billing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <BillingUsage />
              </motion.div>
            )}

            {activeTab === "playerScreen" && studioCampaignId === null && (
              <motion.div
                key="playerStudio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Suspense
                  fallback={
                    <div className="flex h-40 items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" />
                    </div>
                  }
                >
                  <StudioCampaignsPage
                    campaigns={campaigns}
                    loading={campLoading}
                    error={campError}
                    organizationId={orgId}
                    onOpenCampaign={setStudioCampaignId}
                    onOpenStandalone={() =>
                      setStudioCampaignId(STANDALONE_STUDIO)
                    }
                    onCreateCampaign={() => handleSidebarNavigate("creator")}
                    onRetry={() => void refetchCampaigns()}
                  />
                </Suspense>
              </motion.div>
            )}

            {activeTab === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AccountSettings onAvatarChange={setAvatarUrl} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* PLAYER EXPERIENCE STUDIO (full screen) */}
      <AnimatePresence>
        {activeTab === "playerScreen" && studioCampaignId !== null && (
          <motion.div
            key="playerScreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-brand-dark">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" />
                </div>
              }
            >
              <CampaignStudio
                className="h-full"
                campaigns={campaigns}
                prizeTemplates={prizes}
                campaignId={
                  studioCampaignId === STANDALONE_STUDIO
                    ? null
                    : studioCampaignId
                }
                onEditCampaignSettings={handleEditFromStudio}
                onRefreshCampaign={refetchCampaigns}
                onClose={() => handleSidebarNavigate("home")}
                backend={STUDIO_BACKEND}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CAMPAIGN WIZARD OVER THE STUDIO ("Edit in campaign settings") */}
      {studioWizard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Campaign settings"
          className="fixed inset-0 z-[110] overflow-y-auto bg-brand-dark p-4 sm:p-8"
        >
          <div className="mx-auto max-w-6xl">
            <CampaignWizard
              key={`studio-wizard-${studioWizard.campaign.id}-${studioWizard.step}`}
              prizes={prizes}
              editingCampaign={studioWizard.campaign}
              initialStep={studioWizard.step}
              onSave={async (campaign) => {
                await persistCampaign(campaign);
                await closeStudioWizard();
              }}
              onCancel={() => void closeStudioWizard()}
            />
          </div>
        </div>
      )}

      {/* PORTAL SIMULATOR SLIDE-OUT OVERLAY DRAWER */}
      <AnimatePresence>
        {showSandbox && (
          <div
            id="sandbox-modal-overlay"
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50"
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              role="dialog"
              aria-label="Portal Simulator"
              className="w-full max-w-[390px] sm:max-w-[410px] bg-card-bg border-l border-card-border h-full max-h-screen flex flex-col overflow-hidden shadow-2xl text-brand-text"
            >
              <div className="flex items-center gap-2 p-3 border-b border-card-border shrink-0">
                <Smartphone className="w-4 h-4 text-indigo-500 shrink-0" />
                <select
                  aria-label="Campaign"
                  value={sandboxCampaignId}
                  onChange={(e) => setSandboxCampaignId(e.target.value)}
                  className="w-full bg-card-bg border border-card-border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 min-h-9 cursor-pointer"
                >
                  <option value={STANDALONE_STUDIO}>
                    Default experience (demo campaign)
                  </option>
                  {campaigns
                    .filter((c) => c.status !== "archived")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => setShowSandbox(false)}
                  className="p-2 border border-card-border rounded-xl text-brand-text-muted hover:text-brand-text hover:bg-card-hover transition-colors cursor-pointer shrink-0"
                  aria-label="Close sandbox"
                  title="Close sandbox"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Suspense fallback={<div className="flex-1" />}>
                <CampaignSimulator
                  campaigns={campaigns}
                  prizeTemplates={prizes}
                  campaignId={sandboxCampaignId || null}
                  backend={STUDIO_BACKEND}
                />
              </Suspense>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
