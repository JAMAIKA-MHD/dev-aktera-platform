// The dashboard menu.
//   1024px and up: it rests as an icon rail and opens by hover or by the "keep the menu open"
//   button of the top bar (pinned, remembered per person): see useCollapsibleMenu. From 1280px
//   it starts open until the person chooses. Either way the page makes room for it.
//   Under 1024px: a drawer opened by the same button.
// The shell owns the menu's state (useDashboardMenu) and hands it to the menu and to the button.
// Its height never scrolls, on any screen: dashboardShell.css holds the rules.
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useCollapsibleMenu } from "../hooks/useCollapsibleMenu";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useMediaQuery } from "../hooks/useMediaQuery";
import "./dashboardShell.css";
import { PATHS } from "./paths";

const PINNED_KEY = "dashboard-sidebar-pinned";
const FULL_MENU_WIDTH = 1280;
const DRAWER_QUERY = "(max-width: 1023.98px)";

export function useDashboardMenu() {
  const { user } = useAuth();
  const menu = useCollapsibleMenu(
    user?.id ? `${PINNED_KEY}:${user.id}` : PINNED_KEY,
    () => window.innerWidth >= FULL_MENU_WIDTH,
  );
  const isDrawer = useMediaQuery(DRAWER_QUERY);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Set by the product tour: the menu stays open while its entries are explained.
  const [held, setHeld] = useState(false);

  return {
    ...menu,
    expanded: menu.expanded || held,
    isDrawer,
    drawerOpen,
    setDrawerOpen,
    held,
    setHeld,
  };
}

export type DashboardMenu = ReturnType<typeof useDashboardMenu>;

/** The rail's "keep open" button or, on a small screen, the button that opens the drawer. */
export function DashboardMenuToggle({ menu }: { menu: DashboardMenu }) {
  const { t } = useLanguage();
  if (menu.isDrawer) {
    const label = t("nav.openMenu", "Open the menu");
    return (
      <button
        type="button"
        onClick={() => menu.setDrawerOpen(true)}
        aria-expanded={menu.drawerOpen}
        aria-label={label}
        title={label}
        className="dz-icon-btn"
      >
        <Menu className="size-4" aria-hidden />
      </button>
    );
  }
  const label = menu.pinned
    ? t("nav.collapseSidebar", "Collapse the menu")
    : t("nav.pinSidebar", "Keep the menu open");
  const Icon = menu.pinned ? PanelLeftClose : PanelLeftOpen;
  return (
    <button
      type="button"
      onClick={menu.togglePinned}
      aria-pressed={menu.pinned}
      aria-label={label}
      title={label}
      className="flex w-10 h-10 rounded-full bg-card-bg border border-brand-border items-center justify-center text-brand-textMuted hover:text-brand-text cursor-pointer transition-all shadow-sm hover:scale-105"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

function SidebarBody({
  expanded,
  onClose,
}: {
  expanded: boolean;
  /** The drawer's close button. */
  onClose?: () => void;
}) {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const { pathname } = useLocation();

  // `section` is the first path segment an entry stays active for ("/create" and "/campaigns/…"
  // are separate sections, as the tabs were).
  const navItems = [
    {
      to: PATHS.home,
      section: "",
      tour: "sidebar-overview",
      label: t("nav.overview", "Overview"),
      icon: "fa-solid fa-border-all",
    },
    {
      to: PATHS.campaigns,
      section: "campaigns",
      tour: "sidebar-campaigns",
      label: t("nav.campaigns", "Campaign Radios"),
      icon: "fa-solid fa-list-ul",
    },
    {
      to: PATHS.prizes,
      section: "prizes",
      tour: "sidebar-rewards",
      label: t("nav.rewards", "Reward Library"),
      icon: "fa-solid fa-gift",
    },
    {
      to: PATHS.analytics,
      section: "analytics",
      tour: "sidebar-analytics",
      label: t("nav.analytics", "Analytics Desk"),
      icon: "fa-solid fa-chart-line",
    },
    {
      to: PATHS.billing,
      section: "billing",
      tour: "sidebar-billing",
      label: t("nav.billing", "Billing & Quota"),
      icon: "fa-solid fa-file-invoice-dollar",
    },
    {
      to: PATHS.studio,
      section: "studio",
      tour: "sidebar-studio",
      label: t("nav.playerScreen", "Player Studio"),
      icon: "fa-solid fa-mobile-screen",
    },
    {
      to: PATHS.account,
      section: "account",
      tour: "sidebar-organization",
      label: t("nav.organization", "Organization"),
      icon: "fa-regular fa-user",
    },
  ];
  const currentSection = pathname.split("/")[1] ?? "";

  const labelClass = `dz-side-label transition-opacity duration-200 ${
    expanded ? "opacity-100" : "opacity-0 w-0 pointer-events-none"
  }`;
  return (
    <div className="dz-side" data-expanded={expanded}>
      {/* Brand Header */}
      <div className="dz-side-brand border-b border-brand-border/50">
        <div className="dz-side-logo rounded-xl bg-white dark:bg-[#151E30] p-1 flex items-center justify-center shrink-0 shadow-md border border-brand-border/60">
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
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("nav.closeMenu", "Close the menu")}
            title={t("nav.closeMenu", "Close the menu")}
            className="dz-side-close flex size-10 shrink-0 items-center justify-center rounded-xl text-brand-textMuted hover:text-brand-text cursor-pointer"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav aria-label="Dashboard" className="dz-side-nav">
        {navItems.map((item) => {
          const isActive = currentSection === item.section;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              data-tour={item.tour}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              onClick={onClose}
              className={`dz-side-link rounded-2xl transition-colors duration-200 cursor-pointer ${
                isActive
                  ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] font-bold"
                  : "text-brand-textMuted hover:text-brand-text hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
              }`}
            >
              <div className="w-6 flex items-center justify-center shrink-0 text-base">
                <i className={item.icon}></i>
              </div>
              <span className={labelClass}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="dz-side-foot border-t border-brand-border/50">
        {/* Client support: just above the documentation */}
        <NavLink
          to={PATHS.support}
          title={t("nav.support", "Client support")}
          aria-current={currentSection === "support" ? "page" : undefined}
          onClick={onClose}
          className={`dz-side-foot-link transition-colors rounded-xl ${
            currentSection === "support"
              ? "bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold"
              : "text-brand-textMuted hover:text-brand-text hover:bg-black/5 dark:hover:bg-white/5"
          }`}
        >
          <div className="w-6 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-headset"></i>
          </div>
          <span className={labelClass}>
            {t("nav.support", "Client support")}
          </span>
        </NavLink>
        {/* The documentation is a page of its own: it opens in a new tab. */}
        <a
          className="dz-side-foot-link text-brand-textMuted hover:text-brand-text transition-colors rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
          href={PATHS.docs}
          target="_blank"
          rel="noopener noreferrer"
          title={t("nav.docs", "Full documentation")}
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
          title={t("nav.signOut", "Sign out")}
          className="dz-side-foot-link text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 transition-colors rounded-xl cursor-pointer"
        >
          <div className="w-6 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-sign-out-alt"></i>
          </div>
          <span className={`font-bold ${labelClass}`}>
            {t("nav.signOut", "Sign out")}
          </span>
        </button>
      </div>
    </div>
  );
}

function SidebarDrawer({ menu }: { menu: DashboardMenu }) {
  const { t, isRtl } = useLanguage();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const { drawerOpen, setDrawerOpen, held } = menu;
  const open = menu.isDrawer && drawerOpen;

  // While the tour explains the menu, the tour holds the keyboard and decides when it closes.
  useFocusTrap(panelRef, open && !held);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, setDrawerOpen]);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || held) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, held, setDrawerOpen]);

  const hidden = { x: isRtl ? "100%" : "-100%" };
  return (
    <AnimatePresence>
      {open && (
        <div className="dz-drawer">
          <motion.div
            className="dz-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => setDrawerOpen(false)}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu", "Menu")}
            className="dz-drawer-panel glass-panel border-e border-brand-border"
            initial={hidden}
            animate={{ x: 0 }}
            exit={hidden}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
          >
            <SidebarBody expanded onClose={() => setDrawerOpen(false)} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function DashboardSidebar({ menu }: { menu: DashboardMenu }) {
  const { expanded, bind } = menu;
  return (
    <>
      {/* The wrapper holds the room the page leaves to the menu: the rail, or the full menu when
          it is open (hovered or pinned), so the page moves aside instead of being covered. */}
      <div
        className={`relative z-40 hidden h-full shrink-0 transition-[width] duration-200 ease-out lg:block ${
          expanded ? "w-64" : "w-20"
        }`}
      >
        <aside
          data-expanded={expanded}
          {...bind}
          className={`glass-panel absolute inset-y-0 start-0 flex flex-col border-e border-brand-border transition-[width,box-shadow] duration-200 ease-out ${
            expanded ? "w-64" : "w-20"
          }`}
        >
          <SidebarBody expanded={expanded} />
        </aside>
      </div>
      <SidebarDrawer menu={menu} />
    </>
  );
}
