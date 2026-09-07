import React from "react";
import { useEditorStore, RESOLUTION_PRESETS } from "../store/useEditorStore";
import { ScreenId } from "../types";
import { SOFT_UI_THEME } from "../theme/tokens";

interface TopToolbarProps {
  campaigns?: Array<{
    id: string;
    name: string;
    gameType?: string;
    playerScreenConfig?: any;
  }>;
  selectedCampaignId?: string;
  onSelectCampaign?: (campaignId: string) => void;
  onClose?: () => void;
  onSaveCampaign?: () => void;
  isSaving?: boolean;
  onOpenExportModal: () => void;
  onOpenImport: () => void;
  onOpenPreview: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onClose,
  onSaveCampaign,
  isSaving,
  onOpenExportModal,
  onOpenImport,
  onOpenPreview,
}) => {
  const {
    project,
    activeScreen,
    setActiveScreen,
    selectedIds,
    zoom,
    setZoom,
    canvasResolution,
    setCanvasResolution,
    isGridVisible,
    toggleGrid,
    isSnapToGrid,
    toggleSnap,
    alignElements,
    distributeElements,
    resetToStarter,
  } = useEditorStore();

  const screens: {
    id: ScreenId;
    label: string;
    shortLabel: string;
    icon: string;
  }[] = [
    {
      id: "pregame",
      label: "1. Start Screen",
      shortLabel: "Start",
      icon: "fa-solid fa-play",
    },
    {
      id: "game",
      label: "2. Gameplay HUD",
      shortLabel: "HUD",
      icon: "fa-solid fa-gamepad",
    },
    {
      id: "win",
      label: "3. Victory",
      shortLabel: "Win",
      icon: "fa-solid fa-trophy",
    },
    {
      id: "lose",
      label: "4. Game Over",
      shortLabel: "Lose",
      icon: "fa-solid fa-rotate-right",
    },
  ];

  const handleUndo = () => {
    useEditorStore.temporal.getState().undo();
  };

  const handleRedo = () => {
    useEditorStore.temporal.getState().redo();
  };

  return (
    <div className="flex flex-col select-none z-30 shrink-0 text-slate-800">
      {/* Primary Top Bar: Navigation, Campaign, 4 Screen Choice tabs, Actions */}
      <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-2 sm:px-4 flex items-center justify-between overflow-x-auto custom-scrollbar gap-2 sm:gap-3 min-w-0">
        {/* Left section: Back button, Campaign selector, 4 Screen Choice tabs */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Back to main dashboard button */}
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-sm cursor-pointer shrink-0"
              title="Back to Dashboard"
            >
              <i className="fa-solid fa-arrow-left text-xs text-[#2F6FED]" />
              <span className="hidden md:inline">Back</span>
            </button>
          )}

          {/* Campaign Choice Selector */}
          <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-slate-200 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#2F6FED] flex items-center justify-center text-white shadow-sm shrink-0">
              <i className="fa-solid fa-mobile-screen text-xs" />
            </div>

            {campaigns && campaigns.length > 0 ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex flex-col">
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none mb-0.5">
                    Campaign
                  </span>
                  <select
                    value={selectedCampaignId || campaigns[0]?.id}
                    onChange={(e) => onSelectCampaign?.(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2F6FED] cursor-pointer max-w-[120px] sm:max-w-[170px] truncate"
                  >
                    {campaigns.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="bg-white text-slate-800"
                      >
                        {c.name || "Unnamed Campaign"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">
                  {project.name}
                </div>
                <div className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
                  Designer
                </div>
              </div>
            )}
          </div>

          {/* 4 Screen Switcher Tabs (Screen Choice Bar) */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shrink-0">
            {screens.map((scr) => {
              const isActive = activeScreen === scr.id;
              const elementCount =
                project.screens[scr.id]?.elements.length || 0;

              return (
                <button
                  key={scr.id}
                  onClick={() => setActiveScreen(scr.id)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-[#2F6FED] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  }`}
                  title={scr.label}
                >
                  <i className={`${scr.icon} text-[11px]`} />
                  <span className="hidden xl:inline">{scr.label}</span>
                  <span className="hidden sm:inline xl:hidden">
                    {scr.shortLabel}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {elementCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right section: Resolution, Play Preview, Save, Export, Import, Reset */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Resolution Switcher */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shrink-0 shadow-sm">
            <i className="fa-solid fa-display text-xs text-[#2F6FED] mr-1" />
            <select
              value={canvasResolution.id}
              onChange={(e) => {
                const selected = RESOLUTION_PRESETS.find(
                  (p) => p.id === e.target.value,
                );
                if (selected) setCanvasResolution(selected);
              }}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              {RESOLUTION_PRESETS.map((preset) => (
                <option
                  key={preset.id}
                  value={preset.id}
                  className="bg-white text-slate-800"
                >
                  {preset.label} ({preset.width}x{preset.height})
                </option>
              ))}
            </select>
          </div>

          {/* Play / Preview Sandbox (Icon Only) */}
          <button
            onClick={onOpenPreview}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-sm hover:shadow-emerald-500/20 transition-all shrink-0 cursor-pointer flex items-center justify-center active:scale-95"
            title="Test Flow / Play Preview"
          >
            <i className="fa-solid fa-play text-xs" />
          </button>

          {/* Save Campaign Screen Button (Icon Only) */}
          {onSaveCampaign && (
            <button
              onClick={onSaveCampaign}
              disabled={isSaving}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#2F6FED] hover:bg-[#2558CA] text-white shadow-sm hover:shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer shrink-0 flex items-center justify-center active:scale-95"
              title="Save Screen Configuration"
            >
              <i
                className={
                  isSaving
                    ? "fa-solid fa-spinner fa-spin text-xs"
                    : "fa-solid fa-floppy-disk text-xs"
                }
              />
            </button>
          )}

          {/* Export Project Button */}
          <button
            onClick={onOpenExportModal}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow-indigo-500/20 transition-all shrink-0 cursor-pointer flex items-center justify-center active:scale-95"
            title="Export Project (JSON / React Component)"
          >
            <i className="fa-solid fa-file-export text-xs" />
          </button>

          {/* Import Project Button */}
          <button
            onClick={onOpenImport}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-sm hover:shadow-violet-500/20 transition-all shrink-0 cursor-pointer flex items-center justify-center active:scale-95"
            title="Import Project JSON"
          >
            <i className="fa-solid fa-folder-open text-xs" />
          </button>

          {/* Reset Starter Project Button */}
          <button
            onClick={resetToStarter}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm hover:shadow-rose-500/20 transition-all shrink-0 cursor-pointer flex items-center justify-center active:scale-95"
            title="Reset to Starter Project"
          >
            <i className="fa-solid fa-rotate-left text-xs" />
          </button>
        </div>
      </header>

      {/* Secondary Sub-Toolbar: Clean Light Soft UI Tools Bar */}
      <div className="h-10 bg-[#F8FAFC] border-b border-slate-200/80 px-4 flex items-center justify-center gap-2.5 select-none overflow-x-auto custom-scrollbar">
        {/* Game Mechanic Badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-[#2F6FED] shadow-sm shrink-0"
          title="Active campaign game mechanic"
        >
          <i className="fa-solid fa-lock text-[9px] text-amber-500" />
          {(() => {
            const activeCamp = campaigns?.find(
              (c) => c.id === (selectedCampaignId || campaigns[0]?.id),
            );
            const gt =
              activeCamp?.gameType || project.templateId || "lucky_wheel";
            if (gt === "lucky_wheel")
              return (
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-dharmachakra text-amber-500 text-xs" />
                  <span className="hidden sm:inline">Lucky Wheel</span>
                </span>
              );
            if (gt === "scratch_card")
              return (
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-ticket text-emerald-600 text-xs" />
                  <span className="hidden sm:inline">Scratch Card</span>
                </span>
              );
            if (gt === "mystery_box")
              return (
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-box-open text-purple-600 text-xs" />
                  <span className="hidden sm:inline">Mystery Box</span>
                </span>
              );
            if (gt === "hit_it")
              return (
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-bolt text-amber-500 text-xs" />
                  <span className="hidden sm:inline">Hit It</span>
                </span>
              );
            if (gt === "quiz")
              return (
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-brain text-sky-600 text-xs" />
                  <span className="hidden sm:inline">Trivia Quiz</span>
                </span>
              );
            return (
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-gamepad text-[#2F6FED] text-xs" />
                <span className="hidden sm:inline">Game Locked</span>
              </span>
            );
          })()}
        </div>

        {/* 1. Alignment & Spacing Tools Pill */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 px-1.5 py-1 rounded-xl shadow-sm shrink-0">
          <button
            disabled={selectedIds.length === 0}
            onClick={() => alignElements(activeScreen, "left")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
            title="Align Left"
          >
            <i className="fa-solid fa-align-left text-xs" />
          </button>
          <button
            disabled={selectedIds.length === 0}
            onClick={() => alignElements(activeScreen, "center")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
            title="Align Center Horizontal"
          >
            <i className="fa-solid fa-align-center text-xs" />
          </button>
          <button
            disabled={selectedIds.length === 0}
            onClick={() => alignElements(activeScreen, "right")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
            title="Align Right"
          >
            <i className="fa-solid fa-align-right text-xs" />
          </button>

          <span className="w-px h-3.5 bg-slate-200 mx-1" />

          <button
            disabled={selectedIds.length === 0}
            onClick={() => alignElements(activeScreen, "top")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
            title="Align Top"
          >
            <i className="fa-solid fa-arrow-up-from-bracket text-xs" />
          </button>
          <button
            disabled={selectedIds.length === 0}
            onClick={() => alignElements(activeScreen, "middle")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
            title="Align Middle Vertical"
          >
            <i className="fa-solid fa-arrows-up-down text-xs" />
          </button>
          <button
            disabled={selectedIds.length === 0}
            onClick={() => alignElements(activeScreen, "bottom")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
            title="Align Bottom"
          >
            <i className="fa-solid fa-arrow-down-to-bracket text-xs" />
          </button>

          <span className="w-px h-3.5 bg-slate-200 mx-1" />

          <button
            disabled={selectedIds.length < 3}
            onClick={() => distributeElements(activeScreen, "horizontal")}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:pointer-events-none transition-colors"
            title="Distribute Evenly Horizontal"
          >
            <i className="fa-solid fa-distribute-spacing-horizontal text-xs" />
          </button>
        </div>

        {/* 2. Undo / Redo Pill */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 px-1.5 py-1 rounded-xl shadow-sm shrink-0">
          <button
            onClick={handleUndo}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <i className="fa-solid fa-rotate-left text-xs" />
          </button>
          <button
            onClick={handleRedo}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <i className="fa-solid fa-rotate-right text-xs" />
          </button>
        </div>

        {/* 3. Grid & Magnet / Snap Pill */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-1 rounded-xl shadow-sm shrink-0">
          <button
            onClick={toggleGrid}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              isGridVisible
                ? "text-[#2F6FED] bg-blue-50 font-bold"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Toggle Canvas Grid"
          >
            <i className="fa-solid fa-border-all" />
          </button>
          <button
            onClick={toggleSnap}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              isSnapToGrid
                ? "text-[#2F6FED] bg-blue-50 font-bold"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Toggle Snap to Grid"
          >
            <i className="fa-solid fa-magnet" />
          </button>
        </div>

        {/* 4. Zoom Controls Pill */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-sm text-xs text-slate-700 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
            className="hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition-colors"
            title="Zoom Out"
          >
            <i className="fa-solid fa-minus text-[10px]" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="font-mono text-[11px] px-1.5 py-0.5 rounded hover:text-[#2F6FED] hover:bg-slate-100 font-bold transition-colors"
            title="Reset Zoom (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
            className="hover:text-slate-900 p-1 rounded hover:bg-slate-100 transition-colors"
            title="Zoom In"
          >
            <i className="fa-solid fa-plus text-[10px]" />
          </button>
        </div>
      </div>
    </div>
  );
};
