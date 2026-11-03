// The two small menus at the end of the top bar: notifications and the account.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  ChevronDown,
  Compass,
  LogOut,
  Settings,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useOnboarding } from "./onboarding/OnboardingContext";
import { PATHS } from "./paths";

const ICON = {
  size: 18,
  strokeWidth: 1.75,
  className: "dz-icon",
  "aria-hidden": true,
} as const;

// Open state of a small menu: closes on Escape (back to its button) and on a click outside.
function usePopover() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, rootRef, buttonRef };
}

export function NotificationsMenu() {
  const { t } = useLanguage();
  const { open, setOpen, rootRef, buttonRef } = usePopover();
  const label = t("topbar.notifications", "Notifications");
  return (
    <div ref={rootRef} className="dz-pop-root">
      <button
        ref={buttonRef}
        type="button"
        className="dz-icon-btn"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        <Bell {...ICON} />
      </button>
      {open && (
        <div className="dz-pop" role="region" aria-label={label}>
          <div className="dz-pop-empty">
            <span aria-hidden className="dz-pop-check">
              <Check {...ICON} />
            </span>
            <p className="ov-strong">
              {t("topbar.allCaughtUp", "You're all caught up")}
            </p>
            <p className="ov-caption">
              {t(
                "topbar.allCaughtUpHint",
                "New alerts about your campaigns and rewards appear here.",
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountMenu({ initial }: { initial: string }) {
  const { t } = useLanguage();
  const { profile, signOut } = useAuth();
  const { replayTour } = useOnboarding();
  const { open, setOpen, rootRef, buttonRef } = usePopover();
  const label = t("topbar.accountMenu", "Account menu");
  return (
    <div ref={rootRef} className="dz-pop-root">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="dz-avatar-pill"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span aria-hidden className="dz-avatar">
          {initial}
        </span>
        <ChevronDown {...ICON} size={14} />
      </button>
      {open && (
        <div className="dz-pop" role="menu" aria-label={label}>
          {profile && (
            <div className="dz-pop-who">
              <p className="ov-strong" dir="auto">
                {profile.full_name}
              </p>
              <p className="ov-caption">{profile.email}</p>
            </div>
          )}
          <Link
            to={PATHS.account}
            role="menuitem"
            className="dz-pop-item"
            onClick={() => setOpen(false)}
          >
            <Settings {...ICON} />
            {t("topbar.organizationSettings", "Organization settings")}
          </Link>
          <button
            type="button"
            role="menuitem"
            className="dz-pop-item"
            onClick={() => {
              setOpen(false);
              replayTour();
            }}
          >
            <Compass {...ICON} />
            {t("onboarding.replay", "Replay product tour")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="dz-pop-item"
            onClick={() => void signOut()}
          >
            <LogOut {...ICON} />
            {t("nav.signOut", "Sign out")}
          </button>
        </div>
      )}
    </div>
  );
}
