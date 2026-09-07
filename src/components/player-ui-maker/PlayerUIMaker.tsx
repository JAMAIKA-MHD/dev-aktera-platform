import React, { useState, useRef } from "react";
import { useEditorStore } from "./store/useEditorStore";
import { useEditorKeyboardShortcuts } from "./utils/keyboardShortcuts";
import { TopToolbar } from "./panels/TopToolbar";
import { LayersPanel } from "./panels/LayersPanel";
import { EditorCanvas } from "./canvas/EditorCanvas";
import { InspectorPanel } from "./panels/InspectorPanel";
import { CustomTimelineEditor } from "./panels/CustomTimelineEditor";
import { ExportModal } from "./panels/ExportModal";
import { PlayPreviewModal } from "./preview/PlayPreviewModal";
import { parseImportedProjectFile } from "./utils/exportImport";
import { AnimationConfig, UIProject } from "./types";
import { createProjectForGameType } from "./store/defaultProjects";

export interface PlayerUIMakerProps {
  campaigns?: Array<{
    id: string;
    name: string;
    gameType?: string;
    playerScreenConfig?: any;
    [key: string]: any;
  }>;
  selectedCampaignId?: string;
  onSelectCampaign?: (campaignId: string) => void;
  onClose?: () => void;
  onSave?: (campaignId: string, project: UIProject) => void | Promise<void>;
}

export const PlayerUIMaker: React.FC<PlayerUIMakerProps> = ({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onClose,
  onSave,
}) => {
  const { project, activeScreen, updateElement, loadProject } =
    useEditorStore();

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const activeCampaignId = selectedCampaignId || campaigns?.[0]?.id;

  // When selected campaign changes, load its project if present or configure for campaign
  React.useEffect(() => {
    if (!activeCampaignId || !campaigns) return;
    const currentCampaign = campaigns.find((c) => c.id === activeCampaignId);
    if (!currentCampaign) return;

    if (currentCampaign.playerScreenConfig?.uiProject) {
      loadProject(currentCampaign.playerScreenConfig.uiProject);
    } else {
      // Initialize starter project tailored to the campaign's locked game mechanic
      const starter = createProjectForGameType(
        currentCampaign.gameType || "lucky_wheel",
        currentCampaign.name || "Campaign Player Screen",
      );
      starter.id = `project-${currentCampaign.id}`;
      loadProject(starter);
    }
  }, [activeCampaignId]);

  const handleSaveCampaign = async () => {
    if (!activeCampaignId || !onSave) return;
    setIsSaving(true);
    try {
      await onSave(activeCampaignId, project);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save campaign UI:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Enable global editor keyboard shortcuts (arrow nudge, undo/redo, del, dup, copy/paste)
  useEditorKeyboardShortcuts();

  // Modal states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Sidebar collapsible visibility states (default open, toggleable on sides)
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // GSAP Timeline modal state
  const [timelineTarget, setTimelineTarget] = useState<{
    elementId: string;
    animIndex: number;
  } | null>(null);

  // Hidden File input ref for JSON import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenTimelineEditor = (elementId: string, animIndex: number) => {
    setTimelineTarget({ elementId, animIndex });
  };

  const handleTimelineSave = (updatedConfig: AnimationConfig) => {
    if (!timelineTarget) return;
    const screen = project.screens[activeScreen];
    const el = screen?.elements.find((e) => e.id === timelineTarget.elementId);
    if (!el) return;

    const animations = [...(el.animations || [])];
    animations[timelineTarget.animIndex] = updatedConfig;
    updateElement(activeScreen, el.id, { animations });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await parseImportedProjectFile(file);
      loadProject(imported);
      alert(`Project "${imported.name}" imported successfully!`);
    } catch (err: any) {
      alert(`Import Failed: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  };

  const activeElementForTimeline = timelineTarget
    ? project.screens[activeScreen]?.elements.find(
        (e) => e.id === timelineTarget.elementId,
      )
    : null;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#F0F2F5] flex flex-col z-50 overflow-hidden select-none font-sans text-[#2D3748]">
      {/* Hidden File Input for JSON Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Toolbar */}
      <TopToolbar
        campaigns={campaigns}
        selectedCampaignId={activeCampaignId}
        onSelectCampaign={onSelectCampaign}
        onClose={onClose}
        onSaveCampaign={onSave ? handleSaveCampaign : undefined}
        isSaving={isSaving}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenImport={handleImportClick}
        onOpenPreview={() => setIsPreviewModalOpen(true)}
      />

      {/* Main Workspace: Left Panels + Center Canvas + Right Inspector */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Layers Panel */}
        {isLeftSidebarOpen && (
          <div className="flex h-full shrink-0 animate-slide-left z-20">
            <LayersPanel onToggleCollapse={() => setIsLeftSidebarOpen(false)} />
          </div>
        )}

        {/* Floating Side Button to expand Left Layers sidebar when closed */}
        {!isLeftSidebarOpen && (
          <button
            onClick={() => setIsLeftSidebarOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-30 px-2 py-4 rounded-r-2xl bg-white border-y border-r border-[#E2E8F0] text-[#64748B] hover:text-[#2F6FED] hover:bg-white text-xs flex flex-col items-center gap-2 transition-all group cursor-pointer"
            style={{
              boxShadow: "4px 4px 12px rgba(163, 177, 198, 0.25)",
            }}
            title="Open Layers Sidebar"
          >
            <i className="fa-solid fa-layer-group text-[#2F6FED] text-xs group-hover:scale-110 transition-transform" />
            <i className="fa-solid fa-chevron-right text-[9px] text-[#94A3B8] group-hover:text-[#2F6FED]" />
          </button>
        )}

        {/* Center: Interactive Canvas */}
        <EditorCanvas />

        {/* Floating Side Button to expand Right Inspector when closed */}
        {!isRightSidebarOpen && (
          <button
            onClick={() => setIsRightSidebarOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 px-2 py-4 rounded-l-2xl bg-white border-y border-l border-[#E2E8F0] text-[#64748B] hover:text-[#2F6FED] hover:bg-white text-xs flex flex-col items-center gap-2 transition-all group cursor-pointer"
            style={{
              boxShadow: "-4px 4px 12px rgba(163, 177, 198, 0.25)",
            }}
            title="Open Properties Inspector"
          >
            <i className="fa-solid fa-sliders text-[#2F6FED] text-xs group-hover:scale-110 transition-transform" />
            <i className="fa-solid fa-chevron-left text-[9px] text-[#94A3B8] group-hover:text-[#2F6FED]" />
          </button>
        )}

        {/* Right Side: Property Inspector */}
        {isRightSidebarOpen && (
          <div className="h-full shrink-0 animate-slide-right z-20">
            <InspectorPanel
              onToggleCollapse={() => setIsRightSidebarOpen(false)}
              onOpenTimelineEditor={handleOpenTimelineEditor}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <PlayPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
      />

      {timelineTarget && activeElementForTimeline && (
        <CustomTimelineEditor
          element={activeElementForTimeline}
          animationIndex={timelineTarget.animIndex}
          isOpen={true}
          onClose={() => setTimelineTarget(null)}
          onSave={handleTimelineSave}
        />
      )}

      {/* Save Success Toast */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#10B981] text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-600/30 font-bold text-xs animate-bounce">
          <i className="fa-solid fa-cloud-arrow-up text-sm" />
          <span>Screen configuration saved to Supabase!</span>
        </div>
      )}
    </div>
  );
};
