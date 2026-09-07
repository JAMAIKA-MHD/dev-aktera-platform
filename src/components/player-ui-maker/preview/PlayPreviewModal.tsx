import React, { useState } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { ScreenId } from "../types";
import { PlayerUIRuntime } from "../runtime/PlayerUIRuntime";
import { fireWinConfetti } from "../utils/confettiUtils";
import { DeviceFrame, DeviceFrameType } from "../canvas/DeviceFrame";

interface PlayPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayPreviewModal: React.FC<PlayPreviewModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { project, mockData, canvasResolution } = useEditorStore();

  const [previewScreen, setPreviewScreen] = useState<ScreenId>("pregame");
  const [liveData, setLiveData] = useState<Record<string, any>>(mockData);
  const [activeEvent, setActiveEvent] = useState<string | null>(null);

  const previewContainerRef = React.useRef<HTMLDivElement>(null);
  const [previewDims, setPreviewDims] = useState({ width: 360, height: 720 });

  const deviceType: DeviceFrameType =
    canvasResolution.id === "tablet-4-3"
      ? "tablet"
      : canvasResolution.id === "desktop-1080p"
        ? "desktop"
        : "mobile";

  React.useEffect(() => {
    if (!isOpen) return;

    const updateDims = () => {
      if (!previewContainerRef.current) return;
      const { clientWidth, clientHeight } = previewContainerRef.current;

      const bezelW =
        deviceType === "mobile" ? 24 : deviceType === "tablet" ? 36 : 20;
      const bezelH =
        deviceType === "mobile" ? 72 : deviceType === "tablet" ? 36 : 56;
      const paddingX = clientWidth < 600 ? 16 : 32;
      const paddingY = clientHeight < 600 ? 16 : 32;

      const maxW = Math.max(160, clientWidth - paddingX - bezelW);
      const maxH = Math.max(240, clientHeight - paddingY - bezelH);

      const targetAspect = canvasResolution.width / canvasResolution.height;
      let h = maxH;
      let w = h * targetAspect;

      if (w > maxW) {
        w = maxW;
        h = w / targetAspect;
      }
      if (h > maxH) {
        h = maxH;
        w = h * targetAspect;
      }

      if (
        deviceType === "mobile" &&
        canvasResolution.id === "mobile-portrait"
      ) {
        w = Math.min(390, w);
        h = w / targetAspect;
      }

      setPreviewDims({
        width: Math.round(w),
        height: Math.round(h),
      });
    };

    updateDims();
    const obs = new ResizeObserver(updateDims);
    if (previewContainerRef.current) obs.observe(previewContainerRef.current);
    window.addEventListener("resize", updateDims);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", updateDims);
    };
  }, [isOpen, canvasResolution, deviceType]);

  if (!isOpen) return null;

  const triggerGameEvent = (eventName: string) => {
    setActiveEvent(eventName);

    if (eventName === "spendTurn") {
      const currentTurns = Number(liveData["game.turns"] ?? 3);
      const nextTurns = Math.max(0, currentTurns - 1);
      setLiveData((d) => ({ ...d, "game.turns": nextTurns }));
      if (nextTurns === 0) {
        setTimeout(() => setPreviewScreen("lose"), 600);
      }
    } else if (eventName === "scoreIncrease") {
      const currentScore = parseInt(liveData["player.score"] ?? "0") || 0;
      const nextScore = currentScore + 500;
      setLiveData((d) => ({
        ...d,
        "player.score": String(nextScore),
      }));
    } else if (eventName === "win") {
      fireWinConfetti();
      setPreviewScreen("win");
    } else if (eventName === "lose") {
      setPreviewScreen("lose");
    }

    setTimeout(() => {
      setActiveEvent(null);
    }, 450);
  };

  const handleAction = (actionName: string) => {
    if (actionName === "game.start" || actionName.includes("start")) {
      setPreviewScreen("game");
    } else if (
      actionName === "retry" ||
      actionName.includes("retry") ||
      actionName.includes("again")
    ) {
      setLiveData(mockData);
      setPreviewScreen("game");
    } else if (actionName === "prize.claim" || actionName.includes("claim")) {
      fireWinConfetti();
      alert("Reward Claimed Successfully!");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-md animate-fade-in select-none text-[#2D3748] overflow-hidden">
      {/* Top Simulation Controller Header */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-white border-b border-[#E2E8F0] flex items-center justify-between z-10 shrink-0 overflow-x-auto custom-scrollbar gap-3 shadow-[0_4px_12px_rgba(163,177,198,0.15)]">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-bold text-xs sm:text-sm text-[#2D3748]">
              Simulator Sandbox
            </span>
          </div>

          {/* 4 Screen Switcher in Preview */}
          <div className="flex items-center gap-1 bg-[#F0F2F5] p-1 rounded-2xl border border-[#E2E8F0]">
            {(["pregame", "game", "win", "lose"] as const).map((sId) => (
              <button
                key={sId}
                onClick={() => setPreviewScreen(sId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  previewScreen === sId
                    ? "bg-[#2F6FED] text-white shadow-[0_2px_8px_rgba(47,111,237,0.35)]"
                    : "text-[#64748B] hover:text-[#2D3748] hover:bg-white/60"
                }`}
              >
                {sId}
              </button>
            ))}
          </div>
        </div>

        {/* Mock Event Trigger Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mr-1 hidden md:inline">
            Dispatch Events:
          </span>

          <button
            onClick={() => triggerGameEvent("spendTurn")}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0F2F5] text-[#2F6FED] border border-[#CBD5E1] text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <i className="fa-solid fa-rotate text-xs" />
            <span>Turn ({liveData["game.turns"] ?? 3})</span>
          </button>

          <button
            onClick={() => triggerGameEvent("scoreIncrease")}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0F2F5] text-[#D97706] border border-[#CBD5E1] text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <i className="fa-solid fa-coins text-xs" />
            <span>Score (+500)</span>
          </button>

          <button
            onClick={() => triggerGameEvent("win")}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0F2F5] text-[#10B981] border border-[#CBD5E1] text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <i className="fa-solid fa-trophy text-xs" />
            <span>Win</span>
          </button>

          <button
            onClick={() => triggerGameEvent("lose")}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-[#F0F2F5] text-[#64748B] border border-[#CBD5E1] text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <i className="fa-solid fa-face-frown text-xs" />
            <span>Loss</span>
          </button>
        </div>

        {/* Live Data Sliders & Close */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex items-center gap-1.5 text-xs bg-[#F0F2F5] px-3 py-1.5 rounded-xl border border-[#E2E8F0]">
            <span className="text-[#64748B] font-bold">Score:</span>
            <span className="font-mono text-[#2F6FED] text-xs font-bold">
              {liveData["player.score"] ?? "1500"}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F0F2F5] text-[#64748B] hover:text-[#2D3748] font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-sm"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Main Simulation Viewport with Device Frame */}
      <div
        ref={previewContainerRef}
        className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-[#F0F2F5]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <DeviceFrame
          deviceType={deviceType}
          width={previewDims.width}
          height={previewDims.height}
          campaignSlug={project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}
        >
          <PlayerUIRuntime
            project={project}
            activeScreen={previewScreen}
            data={liveData}
            onAction={handleAction}
            activeEvent={activeEvent}
          />
        </DeviceFrame>
      </div>
    </div>
  );
};
