// The dashboard menu. It rests as an icon rail and opens by hover (over the page) or by the
// "keep the menu open" entry at its foot (pinned, remembered): see useCollapsibleMenu.
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useCollapsibleMenu } from "../hooks/useCollapsibleMenu";
import { PATHS } from "./paths";

const PINNED_KEY = "dashboard-sidebar-pinned";

export function DashboardSidebar() {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const { pathname } = useLocation();

  const { pinned, expanded, togglePinned, bind } =
    useCollapsibleMenu(PINNED_KEY);

  // `section` is the first path segment an entry stays active for ("/create" and "/campaigns/…"
  // are separate sections, as the tabs were).
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

  const labelClass = `transition-opacity duration-200 ${
    expanded ? "opacity-100" : "opacity-0 w-0 pointer-events-none"
  }`;
  const toggleLabel = pinned
    ? t("nav.collapseSidebar", "Collapse the menu")
    : t("nav.pinSidebar", "Keep the menu open");

  return (
    // The wrapper holds the room the page leaves to the menu: the rail, or the full menu when
    // pinned. The menu itself is laid over it, so hovering never pushes the page.
    <div
      className={`relative z-40 hidden h-full shrink-0 transition-[width] duration-300 ease-in-out lg:block ${
        pinned ? "w-64" : "w-20"
      }`}
    >
      <aside
        data-expanded={expanded}
        {...bind}
        className={`glass-panel absolute inset-y-0 left-0 flex flex-col border-r border-brand-border transition-[width,box-shadow] duration-300 ease-in-out ${
          expanded ? "w-64" : "w-20"
        } ${expanded && !pinned ? "shadow-2xl" : ""}`}
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
            className={`font-black text-xl tracking-wider text-brand-text ${labelClass}`}
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
                title={!expanded ? item.label : undefined}
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
                <span className={`text-sm ${labelClass}`}>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-brand-border/50 space-y-1.5 overflow-hidden whitespace-nowrap">
          {/* Click mode: keeps the menu open, or closes it back to the rail */}
          <button
            type="button"
            onClick={togglePinned}
            aria-pressed={pinned}
            aria-label={toggleLabel}
            title={!expanded ? toggleLabel : undefined}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 text-brand-textMuted hover:text-brand-text text-xs transition-colors rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <div className="w-6 flex items-center justify-center shrink-0">
              {pinned ? (
                <ChevronsLeft className="size-4" aria-hidden />
              ) : (
                <ChevronsRight className="size-4" aria-hidden />
              )}
            </div>
            <span className={labelClass}>{toggleLabel}</span>
          </button>
          <a
            className="flex items-center gap-3.5 px-3 py-2.5 text-brand-textMuted hover:text-brand-text text-xs transition-colors rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
            href="#"
            title={!expanded ? t("nav.docs", "Full documentation") : undefined}
          >
            <div className="w-6 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-book"></i>
            </div>
            <span className={labelClass}>
              {t("nav.docs", "Full documentation")}
            </span>
          </a>
          <button
            onClick={signOut}
            title={!expanded ? t("nav.signOut", "Sign out") : undefined}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 text-xs transition-colors rounded-xl cursor-pointer"
          >
            <div className="w-6 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-sign-out-alt"></i>
            </div>
            <span className={`font-bold ${labelClass}`}>
              {t("nav.signOut", "Sign out")}
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
