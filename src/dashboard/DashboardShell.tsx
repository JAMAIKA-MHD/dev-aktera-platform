// The dashboard frame shared by every page: sidebar (real links), top bar, the action-error
// banner and the Portal Simulator drawer. The page itself comes from the router (<Outlet />).
import React, { Suspense, lazy, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Smartphone, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useDashboard } from "./DashboardContext";
import { PATHS, STANDALONE_STUDIO } from "./paths";
import { STUDIO_BACKEND } from "./studioBackend";

// The Portal Simulator (T7.2): the real runtime in a phone-sized frame, loaded on demand.
const CampaignSimulator = lazy(() =>
  import("../features/player-experience").then((module) => ({
    default: module.CampaignSimulator,
  })),
);

export function PageSpinner({ className = "h-40" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" />
    </div>
  );
}

export function DashboardShell() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { campaigns, prizes, avatarUrl, actionError, setActionError } =
    useDashboard();

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Portal Simulator drawer and the campaign it plays: its own, never the Studio's.
  const [showSandbox, setShowSandbox] = useState(false);
  const [sandboxCampaignId, setSandboxCampaignId] = useState("");
  useEffect(() => {
    if (campaigns.length > 0 && !sandboxCampaignId) {
      setSandboxCampaignId(campaigns[0].id);
    }
  }, [campaigns, sandboxCampaignId]);

  // `to` is where the link goes; `section` is the first path segment it stays active for
  // ("/create" and "/campaigns/…" are separate sections, as before with the tabs).
  const navItems = [
    {
      to: PATHS.home,
      section: "",
      label: t("nav.overview", "Overview"),
      icon: "fa-solid fa-border-all",
    },
    {
      to: PATHS.campaigns,
      section: "campaigns",
      label: t("nav.campaigns", "Campaign Radios"),
      icon: "fa-solid fa-list-ul",
    },
    {
      to: PATHS.prizes,
      section: "prizes",
      label: t("nav.rewards", "Reward Library"),
      icon: "fa-solid fa-gift",
    },
    {
      to: PATHS.analytics,
      section: "analytics",
      label: t("nav.analytics", "Analytics Desk"),
      icon: "fa-solid fa-chart-line",
    },
    {
      to: PATHS.billing,
      section: "billing",
      label: t("nav.billing", "Billing & Quota"),
      icon: "fa-solid fa-file-invoice-dollar",
    },
    {
      to: PATHS.studio,
      section: "studio",
      label: t("nav.playerScreen", "Player Studio"),
      icon: "fa-solid fa-mobile-screen",
    },
    {
      to: PATHS.account,
      section: "account",
      label: t("nav.organization", "Organization"),
      icon: "fa-regular fa-user",
    },
  ];
  const currentSection = pathname.split("/")[1] ?? "";

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
        <nav
          aria-label="Dashboard"
          className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1.5 overflow-x-hidden"
        >
          {navItems.map((item) => {
            const isActive = currentSection === item.section;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={!isSidebarHovered ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
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
              </NavLink>
            );
          })}
        </nav>

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
              onClick={() => navigate(PATHS.account)}
              className="relative cursor-pointer hover:opacity-90 transition-opacity"
              title="Account Settings"
            >
              <img
                alt="User profile"
                className="w-10 h-10 rounded-full object-cover border border-brand-border shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                src={avatarUrl}
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

        {/* PAGE: the route decides what shows here */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2 z-10 scroll-smooth">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          </motion.div>
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
