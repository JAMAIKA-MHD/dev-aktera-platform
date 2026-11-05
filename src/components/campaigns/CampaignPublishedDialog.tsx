// Shown once a campaign has just gone live: what it took to get here is done, and the link and
// the QR code are what the brand needs next.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Rocket, X } from "lucide-react";

import { cn } from "../../lib/utils";
import type { Campaign } from "../../types";
import { isScheduled } from "./campaignMeta";
import { CampaignLinkShare } from "./CampaignLinkShare";
import { CxButton, cxRoot, cxText } from "./campaignUi";

export function CampaignPublishedDialog({
  campaign,
  onClose,
}: {
  campaign: Pick<Campaign, "name" | "slug" | "startDate">;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const scheduled = isScheduled({ ...campaign, status: "active" });
  const title = scheduled
    ? "Your campaign is scheduled"
    : "Your campaign is live";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Escape closes an open menu first, not the whole window.
      if (dialog.current?.querySelector('[aria-expanded="true"]')) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className={cn(
        cxRoot,
        "fixed inset-0 z-50 flex items-center justify-center bg-cx-scrim p-4",
      )}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-cx-xl border border-cx-border bg-cx-surface shadow-cx-pop"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-cx-border px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cx-success-soft text-cx-success">
              <Rocket className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className={cxText.sectionTitle}>{title}</h3>
              <p
                dir="auto"
                className={cn(cxText.caption, "[overflow-wrap:anywhere]")}
              >
                {campaign.name}
                {scheduled ? ": players can play from its start date." : ""}
              </p>
            </div>
          </div>
          <CxButton
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Close"
            onClick={onClose}
          >
            <X aria-hidden />
          </CxButton>
        </header>

        <div className="overflow-y-auto p-5">
          <CampaignLinkShare name={campaign.name} slug={campaign.slug} />
        </div>

        <footer className="flex shrink-0 justify-end border-t border-cx-border px-5 py-4">
          <CxButton variant="primary" autoFocus onClick={onClose}>
            Done
          </CxButton>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
