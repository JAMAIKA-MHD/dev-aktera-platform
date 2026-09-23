import {
  AlertTriangle,
  Check,
  CircleAlert,
  CloudOff,
  ExternalLink,
  Loader2,
  Redo2,
  RotateCw,
  Sparkles,
  Undo2,
} from "lucide-react";
import type { ReactNode } from "react";
import type { StudioCampaignOption } from "../PlayerExperienceStudio";
import { useStudio, useStudioHistory } from "../StudioContext";
import type { Autosave } from "../useAutosave";

// Top bar (plan §9.1): which campaign, undo/redo, whether the work is saved, how many
// problems remain, and the preview in a window of its own.

const STANDALONE = "";

function IconButton({
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      className="flex size-11 items-center justify-center rounded-xl text-brand-text-muted transition hover:bg-card-hover hover:text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-95 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function SaveIndicator({ autosave }: { autosave: Autosave }) {
  const { status, error, retry } = autosave;
  if (status === "error") {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 py-1 pl-3 pr-1 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        title={error ?? undefined}
      >
        <CloudOff className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Not saved</span>
        <button
          type="button"
          onClick={retry}
          className="flex min-h-9 items-center gap-1 rounded-lg bg-red-600 px-2.5 font-bold text-white transition hover:bg-red-500 active:scale-95"
        >
          <RotateCw className="size-3.5" aria-hidden />
          Retry
        </button>
      </div>
    );
  }
  const [icon, label] =
    status === "saving"
      ? [
          <Loader2 key="i" className="size-4 animate-spin" aria-hidden />,
          "Saving…",
        ]
      : status === "saved"
        ? [
            <Check key="i" className="size-4 text-emerald-500" aria-hidden />,
            "Saved",
          ]
        : [
            <Check key="i" className="size-4 opacity-40" aria-hidden />,
            "Autosave on",
          ];
  return (
    <span
      role="status"
      className="flex items-center gap-1.5 text-xs font-semibold text-brand-text-muted"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

function IssuesButton() {
  const issues = useStudio((state) => state.issues);
  const setPanel = useStudio((state) => state.setPanel);
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.length - errors;
  const first = issues.find((issue) => issue.level === "error") ?? issues[0];

  if (!first) {
    return (
      <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
        <Check className="size-4" aria-hidden />
        <span className="hidden md:inline">No issues</span>
      </span>
    );
  }
  const Icon = errors > 0 ? CircleAlert : AlertTriangle;
  const summary = [
    errors ? `${errors} error${errors > 1 ? "s" : ""}` : null,
    warnings ? `${warnings} warning${warnings > 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      onClick={() => setPanel("validation")}
      title={`${summary} — ${first.message}`}
      className={`flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition active:scale-95 ${
        errors > 0
          ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300"
          : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
      }`}
    >
      <Icon className="size-4" aria-hidden />
      <span>{issues.length}</span>
      <span className="hidden md:inline">
        {issues.length > 1 ? "issues" : "issue"}
      </span>
    </button>
  );
}

export function StudioTopBar({
  autosave,
  campaigns,
  onCampaignChange,
}: {
  autosave: Autosave;
  campaigns?: readonly StudioCampaignOption[];
  onCampaignChange?: (campaignId: string | null) => void;
}) {
  const campaignId = useStudio((state) => state.campaignId);
  const campaignName = useStudio((state) => state.campaign?.name ?? null);
  const { canUndo, canRedo, undo, redo } = useStudioHistory();

  const openWindow = () => {
    const params = new URLSearchParams({ source: "local" });
    if (campaignId) params.set("campaignId", campaignId);
    window.open(`/xp-frame?${params}`, "_blank", "noopener");
  };

  return (
    <header className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 border-b border-card-border bg-card-bg px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-600/25">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-wider text-brand-text-muted">
            Player Studio
          </p>
          {campaigns && campaigns.length > 0 && onCampaignChange ? (
            <select
              aria-label="Campaign"
              value={campaignId ?? STANDALONE}
              onChange={(event) => onCampaignChange(event.target.value || null)}
              className="-ml-1 max-w-[14rem] cursor-pointer truncate rounded-lg bg-transparent px-1 text-sm font-bold text-brand-text outline-none hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value={STANDALONE}>Standalone (demo campaign)</option>
              {campaigns.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="truncate text-sm font-bold">
              {campaignName ?? "Standalone (demo campaign)"}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 border-card-border sm:ml-2 sm:border-l sm:pl-2">
        <IconButton
          label="Undo"
          shortcut="Ctrl+Z"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 className="size-[18px]" aria-hidden />
        </IconButton>
        <IconButton
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 className="size-[18px]" aria-hidden />
        </IconButton>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <SaveIndicator autosave={autosave} />
        <IssuesButton />
        <button
          type="button"
          onClick={openWindow}
          className="hidden min-h-11 items-center gap-1.5 rounded-xl border border-card-border px-3 text-xs font-bold text-brand-text transition hover:bg-card-hover active:scale-95 sm:flex"
          title="Open the preview in a new tab, synced live, to use the browser's own DevTools"
        >
          <ExternalLink className="size-4" aria-hidden />
          <span className="hidden xl:inline">Open in window</span>
        </button>
      </div>
    </header>
  );
}
