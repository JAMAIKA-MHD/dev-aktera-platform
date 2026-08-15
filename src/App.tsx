import React, { useState, useEffect } from "react";
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

// Player facing portal sandbox (embedded preview)
import { PhoneFrame } from "./components/PhoneFrame";
import { PlayerLanding } from "./components/PlayerLanding";
import { PlayerGame } from "./components/PlayerGame";
import { PlayerResult } from "./components/PlayerResult";

import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { useLanguage } from "./contexts/LanguageContext";
import { useCampaigns } from "./hooks/useCampaigns";
import { usePrizeTemplates } from "./hooks/usePrizeTemplates";
import { useEntries } from "./hooks/useEntries";
import { toFriendlyErrorMessage } from "./lib/errorMessages";
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

export default function App() {
  const { organization, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, isRtl } = useLanguage();
  const orgId = organization?.id ?? null;

  // Real Supabase data
  const {
    campaigns,
    loading: campLoading,
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

  const [activeTab, setActiveTab] = useState<TabType>("home");

  // Focus & Draft states
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [relaunchDraftCampaign, setRelaunchDraftCampaign] =
    useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [updateDraftSourceCampaign, setUpdateDraftSourceCampaign] =
    useState<Campaign | null>(null);

  // Player Preview Sandbox state (pure visual preview — does NOT write to DB)
  const [showSandbox, setShowSandbox] = useState<boolean>(false);
  const [sandboxCampaignId, setSandboxCampaignId] = useState<string>("");
  const [sandboxScreen, setSandboxScreen] = useState<
    "landing" | "game" | "result"
  >("landing");
  const [sandboxPlayerData, setSandboxPlayerData] = useState({
    name: "",
    phone: "",
    consent: false,
  });
  const [sandboxSelectedPrize, setSandboxSelectedPrize] = useState<any>(null);
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);

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

  const handleSaveCampaign = async (
    newCamp: Omit<Campaign, "participantsCount" | "rewardsClaimed"> & {
      mode?: "create" | "edit" | "relaunch" | "update";
      submitStatus?: "draft" | "active";
    },
  ) => {
    if (!orgId) {
      setActionError(
        "Organization not loaded. Please refresh the page and try again.",
      );
      return;
    }
    setActionError(null);
    try {
      const submitStatus = newCamp.submitStatus ?? newCamp.status;
      const isPublishingUpdate =
        newCamp.mode === "update" && submitStatus === "active";

      await createOrUpdateCampaignFullService(
        {
          orgId,
          newCamp,
          submitStatus,
          isPublishingUpdate,
        },
        prizes,
      );

      setRelaunchDraftCampaign(null);
      setEditingCampaign(null);
      setUpdateDraftSourceCampaign(null);
      setSelectedCampaignId(null);
      await refetchCampaigns();
      await refetchPrizes();
      setActiveTab("campaigns");
    } catch (err) {
      setActionError(toFriendlyErrorMessage(err, "Failed to save campaign."));
    }
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
    setUpdateDraftSourceCampaign(null);
    setRelaunchDraftCampaign(camp);
    setActiveTab("creator");
  };

  const handleEditDraftTrigger = (camp: Campaign) => {
    setRelaunchDraftCampaign(null);
    setUpdateDraftSourceCampaign(null);
    setEditingCampaign(camp);
    setActiveTab("creator");
  };

  const handleUpdateDraftTrigger = (camp: Campaign) => {
    setEditingCampaign(null);
    setRelaunchDraftCampaign(null);
    setUpdateDraftSourceCampaign(camp);
    setActiveTab("creator");
  };

  // Helper: map a B2B Campaign to a sandbox BrandPreset for the visual preview
  const activeSandboxCampaign =
    campaigns.find((c) => c.id === sandboxCampaignId) || campaigns[0];

  const mapCampaignToBrandPreset = (camp: Campaign): any => {
    const campaignPrizes = camp.prizes.map((p) => {
      const template = prizes.find((pr) => pr.id === p.templateId);
      return {
        name: template?.name || "Mystery Reward",
        icon: template?.category === "voucher" ? "📱" : "🎁",
        isWin: true,
      };
    });

    if (camp.winProbability < 100) {
      campaignPrizes.push({
        name: "Better Luck Next Time",
        icon: "🌙",
        isWin: false,
      });
    }

    // Determine premium theme hues
    let primaryColor = "#6366F1";
    let gradientFrom = "#8B5CF6";
    let gradientTo = "#6366F1";

    if (camp.name.toLowerCase().includes("djezzy")) {
      primaryColor = "#E30613";
      gradientFrom = "#FF1A24";
      gradientTo = "#A30009";
    } else if (camp.name.toLowerCase().includes("yassir")) {
      primaryColor = "#10B981";
      gradientFrom = "#34D399";
      gradientTo = "#059669";
    } else if (camp.name.toLowerCase().includes("hamoud")) {
      primaryColor = "#F59E0B";
      gradientFrom = "#FBBF24";
      gradientTo = "#D97706";
    } else if (camp.name.toLowerCase().includes("soummam")) {
      primaryColor = "#3B82F6";
      gradientFrom = "#60A5FA";
      gradientTo = "#2563EB";
    }

    return {
      name: camp.name,
      arabicName: camp.arabicName,
      primaryColor,
      gradientFrom,
      gradientTo,
      description: `Participate & Win premium voucher codes or physical merchandise.`,
      logoUrl: camp.heroImageUrl,
      prizes: campaignPrizes,
    };
  };

  const sandboxBrandPreset = activeSandboxCampaign
    ? mapCampaignToBrandPreset(activeSandboxCampaign)
    : null;

  // Player simulator callback events
  const handleSandboxRegister = (data: any) => {
    setSandboxPlayerData(data);
    setSandboxScreen("game");
  };

  const handleSandboxGameComplete = (prize: any) => {
    setSandboxSelectedPrize(prize);
    setSandboxScreen("result");
    // Sandbox is visual-only — no DB writes; real entries are created in the player portal
  };

  const handleSandboxRestart = () => {
    setSandboxSelectedPrize(null);
    setSandboxScreen("landing");
  };

  const handleSidebarNavigate = (tab: TabType) => {
    setSelectedCampaignId(null);
    setEditingCampaign(null);
    setRelaunchDraftCampaign(null);
    setUpdateDraftSourceCampaign(null);
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
            <div className="relative cursor-pointer">
              <img
                alt="User profile"
                className="w-10 h-10 rounded-full object-cover border border-brand-border shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRIrzL2B44jQOBHs_8Mr5_T7olxzgM6b1g4gWw22aervyasCXua96W9EMGfBs3Hbv_9zNL7W6q68Dap-kyXlJCTapI9qT3WCgI9tFHlCAB92gCphYgPX17Qnu4U6HxnVUGbl8sbA-ULs79sQ5zlbr2TisGtCtC1Qmq1DEjMvqaAg-AbaNcSw2caRxs0HgZ7kySWhAeALg1mGqNgflVBbIxNxh8gNLhxlFARs8RHBYpYaBpFsMgMw-h"
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
                    onEditDraft={handleEditDraftTrigger}
                    onRelaunch={handleRelaunchTrigger}
                    onCreateUpdateDraft={handleUpdateDraftTrigger}
                    onToggleStatus={handleToggleCampaignStatus}
                    onOpenAnalytics={handleOpenAnalyticsDesk}
                  />
                ) : (
                  <CampaignsList
                    campaigns={campaigns}
                    onSelectCampaign={handleCampaignFocus}
                    onEditDraft={handleEditDraftTrigger}
                    onRelaunch={handleRelaunchTrigger}
                    onCreateUpdateDraft={handleUpdateDraftTrigger}
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
                key={`creator-${editingCampaign?.id ?? updateDraftSourceCampaign?.id ?? relaunchDraftCampaign?.id ?? "new"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CampaignWizard
                  prizes={prizes}
                  onSave={handleSaveCampaign}
                  onCancel={() => {
                    setEditingCampaign(null);
                    setRelaunchDraftCampaign(null);
                    setUpdateDraftSourceCampaign(null);
                    setActiveTab("campaigns");
                  }}
                  relaunchDraft={relaunchDraftCampaign}
                  editingCampaign={editingCampaign}
                  updateDraftSource={updateDraftSourceCampaign}
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

            {activeTab === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AccountSettings />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

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
              className="w-full max-w-[540px] bg-slate-900 border-l border-slate-800 h-full flex flex-col p-6 overflow-y-auto relative shadow-2xl text-white"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-indigo-450" />
                    <span>Interactive Player Sandbox</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Preview live lucky wheels/quizzes on mobile viewports
                  </p>
                </div>

                <button
                  onClick={() => setShowSandbox(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector */}
              <div className="space-y-1.5 mb-6">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Select Active Campaign to Simulate
                </label>
                <select
                  value={sandboxCampaignId}
                  onChange={(e) => {
                    setSandboxCampaignId(e.target.value);
                    handleSandboxRestart();
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none min-h-11 cursor-pointer"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-950">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sandbox Smartphone shell */}
              <div className="flex-1 flex items-center justify-center">
                {!sandboxBrandPreset ? (
                  <div className="text-center text-slate-500 text-xs font-mono py-10">
                    <div className="w-6 h-6 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin mx-auto mb-3" />
                    No active campaigns yet — create one first.
                  </div>
                ) : (
                  <PhoneFrame>
                    <AnimatePresence mode="wait">
                      {sandboxScreen === "landing" && (
                        <motion.div
                          key="sandbox-landing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex-1 flex flex-col"
                        >
                          <PlayerLanding
                            activeBrand={sandboxBrandPreset}
                            onRegister={handleSandboxRegister}
                            savedData={sandboxPlayerData}
                          />
                        </motion.div>
                      )}

                      {sandboxScreen === "game" && (
                        <motion.div
                          key="sandbox-game"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex-1 flex flex-col"
                        >
                          <PlayerGame
                            activeBrand={sandboxBrandPreset}
                            forcedOutcome="random"
                            onGameComplete={handleSandboxGameComplete}
                            playerName={sandboxPlayerData.name}
                          />
                        </motion.div>
                      )}

                      {sandboxScreen === "result" && (
                        <motion.div
                          key="sandbox-result"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex-1 flex flex-col"
                        >
                          <PlayerResult
                            activeBrand={sandboxBrandPreset}
                            prize={sandboxSelectedPrize}
                            onRestart={handleSandboxRestart}
                            playerName={sandboxPlayerData.name}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </PhoneFrame>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
