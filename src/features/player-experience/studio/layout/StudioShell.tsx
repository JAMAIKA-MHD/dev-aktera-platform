import { Eye, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { StudioCampaignOption } from "../PlayerExperienceStudio";
import type { Autosave } from "../useAutosave";
import { useUndoShortcuts } from "../useUndoShortcuts";
import { PanelArea } from "./PanelArea";
import { PreviewPane } from "./PreviewPane";
import { StudioNav } from "./StudioNav";
import { StudioTopBar } from "./StudioTopBar";
import "../studio.css";

// The Studio's frame (plan §9.1): top bar, section menu, settings panel, live preview.
// Under 1024 px there is no room for all three columns: the preview moves into a drawer,
// opened by a floating button, so the panel keeps the full width.

const WIDE_QUERY = "(min-width: 1024px)";

function useWideLayout(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia?.(WIDE_QUERY);
      query?.addEventListener("change", onChange);
      return () => query?.removeEventListener("change", onChange);
    },
    () => window.matchMedia?.(WIDE_QUERY).matches ?? true,
    () => true,
  );
}

export interface StudioShellProps {
  loading: boolean;
  autosave: Autosave;
  campaigns?: readonly StudioCampaignOption[];
  onCampaignChange?: (campaignId: string | null) => void;
  className?: string;
}

export function StudioShell({
  loading,
  autosave,
  campaigns,
  onCampaignChange,
  className = "",
}: StudioShellProps) {
  const wide = useWideLayout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useUndoShortcuts();

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-clip bg-brand-dark font-sans text-brand-text ${className}`}
      data-xp-studio
    >
      <StudioTopBar
        autosave={autosave}
        campaigns={campaigns}
        onCampaignChange={onCampaignChange}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <StudioNav />
        <main
          className="min-h-0 flex-1 overflow-y-auto border-card-border bg-card-bg-subtle lg:w-[27rem] lg:flex-none lg:border-r"
          aria-busy={loading}
        >
          {loading ? <PanelSkeleton /> : <PanelArea />}
        </main>
        {wide && (
          <section
            className="flex min-h-0 min-w-0 flex-1 flex-col"
            aria-label="Live preview"
          >
            <PreviewPane />
          </section>
        )}
      </div>

      {!wide && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="absolute bottom-5 right-5 z-20 flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 active:scale-95"
        >
          <Eye className="size-4" aria-hidden />
          Preview
        </button>
      )}
      {!wide && drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Live preview"
          className="absolute inset-0 z-30 flex flex-col bg-brand-dark"
        >
          <div className="flex items-center justify-between border-b border-card-border bg-card-bg px-4 py-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted">
              Live preview
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="flex size-11 items-center justify-center rounded-xl text-brand-text-muted transition hover:bg-card-hover hover:text-brand-text"
              aria-label="Close preview"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <PreviewPane />
        </div>
      )}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-label="Loading the experience">
      {[40, 72, 56, 88].map((width) => (
        <div key={width} className="space-y-2">
          <div className="h-2.5 w-20 animate-pulse rounded-full bg-card-border" />
          <div
            className="h-10 animate-pulse rounded-xl bg-card-border/70"
            style={{ width: `${width}%` }}
          />
        </div>
      ))}
    </div>
  );
}
