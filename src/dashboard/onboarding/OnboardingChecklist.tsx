// "Get started": five first steps, ticked by what the account really has done. It folds, can be
// dismissed, and disappears for good once everything is done.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";

import { useLanguage } from "../../contexts/LanguageContext";
import { useDashboard } from "../DashboardContext";
import { useShellActions } from "../DashboardShell";
import { PATHS } from "../paths";
import { useOnboarding } from "./OnboardingContext";
import "./onboarding.css";

const RING_RADIUS = 16;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  to?: string;
  onClick?: () => void;
}

export function OnboardingChecklist() {
  const { t } = useLanguage();
  const { campaigns, prizes } = useDashboard();
  const { checklistAvailable, sandboxTested, memberCount, dismissChecklist } =
    useOnboarding();
  const { openSandbox } = useShellActions();
  const [folded, setFolded] = useState(false);

  const items: ChecklistItem[] = [
    {
      id: "reward",
      label: t("onboarding.checkReward", "Add your first reward"),
      done: prizes.length > 0,
      to: PATHS.prizes,
    },
    {
      id: "campaign",
      label: t("onboarding.checkCampaign", "Create a campaign"),
      done: campaigns.length > 0,
      to: PATHS.create,
    },
    {
      id: "sandbox",
      label: t("onboarding.checkSandbox", "Test in the player sandbox"),
      done: sandboxTested,
      onClick: openSandbox,
    },
    {
      id: "teammate",
      label: t("onboarding.checkTeammate", "Invite a teammate"),
      done: memberCount > 1,
      to: PATHS.accountTeam,
    },
    {
      id: "launch",
      label: t("onboarding.checkLaunch", "Launch"),
      done: campaigns.some((campaign) => campaign.status === "active"),
      to: PATHS.campaigns,
    },
  ];
  const doneCount = items.filter((item) => item.done).length;
  if (!checklistAvailable || doneCount === items.length) return null;

  const FoldIcon = folded ? ChevronDown : ChevronUp;
  const foldLabel = folded
    ? t("onboarding.checkShow", "Show the steps")
    : t("onboarding.checkHide", "Hide the steps");
  const dismissLabel = t("onboarding.checkDismiss", "Dismiss the checklist");

  return (
    <section
      className="ov-card oc-card"
      aria-labelledby="oc-title"
      data-tour="onboarding-checklist"
    >
      <div className="oc-head">
        <div
          className="oc-ring"
          role="img"
          aria-label={`${doneCount} ${t("onboarding.of", "of")} ${items.length}`}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
            <circle
              className="oc-ring-track"
              cx="20"
              cy="20"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="4"
            />
            <circle
              className="oc-ring-value"
              cx="20"
              cy="20"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="4"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - doneCount / items.length)}
            />
          </svg>
          <span aria-hidden className="dz-num">
            {doneCount}/{items.length}
          </span>
        </div>
        <h2 id="oc-title" className="ov-title">
          {t("onboarding.checkTitle", "Get started")}
        </h2>
        <span className="ov-spacer" />
        <button
          type="button"
          className="dz-icon-btn ov-icon-btn-sm"
          aria-expanded={!folded}
          aria-label={foldLabel}
          title={foldLabel}
          onClick={() => setFolded(!folded)}
        >
          <FoldIcon size={14} strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          className="dz-icon-btn ov-icon-btn-sm"
          aria-label={dismissLabel}
          title={dismissLabel}
          onClick={dismissChecklist}
        >
          <X size={14} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {!folded && (
        <ol className="oc-list">
          {items.map((item) => {
            const content = (
              <>
                <span aria-hidden className="oc-check">
                  {item.done && <Check size={12} strokeWidth={3} />}
                </span>
                {item.label}
                {item.done && (
                  <span className="sr-only">
                    {t("onboarding.checkDone", "(done)")}
                  </span>
                )}
              </>
            );
            return (
              <li key={item.id}>
                {item.to ? (
                  <Link
                    to={item.to}
                    className="oc-item"
                    data-done={item.done || undefined}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="oc-item"
                    data-done={item.done || undefined}
                    onClick={item.onClick}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
