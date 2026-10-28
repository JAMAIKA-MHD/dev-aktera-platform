// The dashboard frame shared by every page: sidebar (real links), top bar, the action-error
// banner and the Portal Simulator drawer. The page itself comes from the router (<Outlet />).
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  Moon,
  Search,
  Smartphone,
  Sun,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import "../components/overview/overview.css";
import { useDashboard } from "./DashboardContext";
import {
  DashboardMenuToggle,
  DashboardSidebar,
  useDashboardMenu,
} from "./DashboardSidebar";
import { PATHS, STANDALONE_STUDIO } from "./paths";
import { STUDIO_BACKEND } from "./studioBackend";

// The Portal Simulator (T7.2): the real runtime in a phone-sized frame, loaded on demand.
const CampaignSimulator = lazy(() =>
  import("../features/player-experience").then((module) => ({
    default: module.CampaignSimulator,
  })),
);

const TOPBAR_ICON = {
  size: 18,
  strokeWidth: 1.75,
  className: "dz-icon",
  "aria-hidden": true,
} as const;

export function PageSpinner({ className = "h-40" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" />
    </div>
  );
}

export function DashboardShell() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { campaigns, prizes, actionError, setActionError } = useDashboard();

  // Portal Simulator drawer and the campaign it plays: its own, never the Studio's.
  const [showSandbox, setShowSandbox] = useState(false);
  const [sandboxCampaignId, setSandboxCampaignId] = useState("");
  useEffect(() => {
    if (campaigns.length > 0 && !sandboxCampaignId) {
      setSandboxCampaignId(campaigns[0].id);
    }
  }, [campaigns, sandboxCampaignId]);

  const menu = useDashboardMenu();

  // The account pill shows the signed-in person's initial.
  const { profile } = useAuth();
  const initial = (profile?.full_name?.trim()[0] ?? "M").toUpperCase();

  // "/" jumps to the search field, unless someone is already typing in a field.
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']"))
        return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const currentSection = pathname.split("/")[1] ?? "";

  return (
    <div
      id="saas-app-root"
      className="h-screen flex overflow-hidden bg-brand-dark font-sans text-brand-text text-sm select-none"
    >
      <DashboardSidebar menu={menu} />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* TOPBAR: search, the player sandbox, theme, notifications, account. */}
        <header
          className="dz-topbar dz-theme"
          data-theme={theme === "dark" ? "dark" : "light"}
        >
          <div className="dz-topbar-start">
            <DashboardMenuToggle menu={menu} />
            {/* Search has no backend yet: the field is here, the results come later. */}
            <div className="dz-search" role="search">
              <Search {...TOPBAR_ICON} />
              <label htmlFor="dz-search" className="sr-only">
                Search
              </label>
              <input
                ref={searchRef}
                id="dz-search"
                type="search"
                placeholder="Search campaigns, rewards, players"
                autoComplete="off"
              />
              <kbd aria-hidden>/</kbd>
            </div>
          </div>
          <div className="dz-topbar-end">
            <button
              type="button"
              onClick={() => setShowSandbox(true)}
              className="sbx"
              title="Try your campaigns as a player would see them"
            >
              <span aria-hidden className="sbx-play">
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M3 1.8v8.4L10 6z" fill="currentColor" />
                </svg>
              </span>
              Open player sandbox
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="dz-icon-btn"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun {...TOPBAR_ICON} />
              ) : (
                <Moon {...TOPBAR_ICON} />
              )}
            </button>

            <button
              type="button"
              className="dz-icon-btn"
              aria-label="Notifications, 3 unread"
              title="Notifications"
            >
              <Bell {...TOPBAR_ICON} />
              <span aria-hidden className="dz-unread-dot" />
            </button>

            <button
              type="button"
              onClick={() => navigate(PATHS.account)}
              className="dz-avatar-pill"
              aria-label="Account settings"
              title="Account settings"
            >
              <span aria-hidden className="dz-avatar">
                {initial}
              </span>
              <ChevronDown {...TOPBAR_ICON} size={14} />
            </button>
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
