import { AlertTriangle, Eye, RotateCcw, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useStudio } from "../StudioContext";
import type { Autosave } from "../useAutosave";
import { useUndoShortcuts } from "../useUndoShortcuts";
import { PanelArea } from "./PanelArea";
import { PreviewPane } from "./PreviewPane";
import {
  PANEL_META,
  StudioMenuToggle,
  StudioNav,
  useStudioMenu,
  type StudioMenu,
} from "./StudioNav";
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
  // The saved design could not be read: the panels and the preview are replaced by this
  // message, so nothing is edited (nor saved over the real design) until it is.
  loadError?: string | null;
  onRetryLoad?: () => void;
  autosave: Autosave;
  onClose?: () => void;
  className?: string;
}

export function StudioShell({
  loading,
  loadError = null,
  onRetryLoad,
  autosave,
  onClose,
  className = "",
}: StudioShellProps) {
  const wide = useWideLayout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useUndoShortcuts();
  const menu = useStudioMenu();

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-clip bg-brand-dark font-sans text-brand-text ${className}`}
      data-xp-studio
    >
      <StudioTopBar autosave={autosave} onClose={onClose} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <StudioNav menu={menu} />
        <main
          className="min-h-0 flex-1 overflow-y-auto border-card-border bg-card-bg-subtle lg:w-[27rem] lg:flex-none lg:border-r"
          aria-busy={loading && !loadError}
        >
          <SettingsHeader menu={menu} />
          {loadError ? (
            <LoadErrorPanel message={loadError} onRetry={onRetryLoad} />
          ) : loading ? (
            <PanelSkeleton />
          ) : (
            <PanelArea />
          )}
        </main>
        {wide && !loadError && (
          <section
            className="flex min-h-0 min-w-0 flex-1 flex-col"
            aria-label="Live preview"
          >
            <PreviewPane />
          </section>
        )}
      </div>

      {!wide && !loadError && (
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

// The head of the settings area: the button that keeps the section menu open sits here, with
// the editing, and moves with the panel when the menu opens (by hover or by click).
function SettingsHeader({ menu }: { menu: StudioMenu }) {
  const panel = useStudio((state) => state.ui.panel);
  return (
    <div className="sticky top-0 z-10 hidden items-center gap-2 border-b border-card-border bg-card-bg-subtle px-3 py-1 lg:flex">
      <StudioMenuToggle menu={menu} />
      <span className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted">
        {PANEL_META[panel].label}
      </span>
    </div>
  );
}

function LoadErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-6" role="alert">
      <div className="space-y-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-text">
          <AlertTriangle className="size-4 text-rose-500" aria-hidden />
          Could not load the saved design.
        </div>
        <p className="text-xs leading-relaxed text-brand-text-muted">
          Nothing can be edited until it is loaded, so that your saved work is
          never replaced. Check your connection, then retry.
        </p>
        <p className="break-words font-mono text-[11px] text-brand-text-muted">
          {message}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-500 active:scale-95"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Retry
          </button>
        )}
      </div>
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
