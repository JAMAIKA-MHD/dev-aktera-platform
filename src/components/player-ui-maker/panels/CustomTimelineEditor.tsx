import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AnimationConfig, CustomKeyframe, UIElement } from "../types";
import { RenderedElement } from "../runtime/RenderedElement";

interface CustomTimelineEditorProps {
  element: UIElement;
  animationIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedConfig: AnimationConfig) => void;
}

const DEFAULT_INITIAL_KEYFRAMES: CustomKeyframe[] = [
  {
    time: 0,
    properties: { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 },
    easing: "power1.out",
  },
  {
    time: 0.5,
    properties: { x: 0, y: -20, scale: 1.15, rotate: 5, opacity: 0.9 },
    easing: "power1.inOut",
  },
  {
    time: 1.0,
    properties: { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 },
    easing: "power1.in",
  },
];

export const CustomTimelineEditor: React.FC<CustomTimelineEditorProps> = ({
  element,
  animationIndex,
  isOpen,
  onClose,
  onSave,
}) => {
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const animTargetRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const existingAnim = element.animations?.[animationIndex];
  const [totalDuration, setTotalDuration] = useState<number>(
    (existingAnim?.duration || 1000) / 1000,
  );
  const [isLoop, setIsLoop] = useState<boolean>(existingAnim?.loop ?? false);
  const [keyframes, setKeyframes] = useState<CustomKeyframe[]>(() => {
    if (
      existingAnim?.customKeyframes &&
      existingAnim.customKeyframes.length > 0
    ) {
      return JSON.parse(JSON.stringify(existingAnim.customKeyframes));
    }
    return DEFAULT_INITIAL_KEYFRAMES;
  });

  const [selectedKfIndex, setSelectedKfIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Build / rebuild the GSAP Timeline instance whenever keyframes or duration change
  useGSAP(
    () => {
      if (!animTargetRef.current) return;

      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      const tl = gsap.timeline({
        paused: true,
        repeat: isLoop ? -1 : 0,
        onUpdate: () => {
          setProgress(tl.progress());
        },
      });

      const sorted = [...keyframes].sort((a, b) => a.time - b.time);

      sorted.forEach((kf, idx) => {
        if (idx === 0) {
          gsap.set(animTargetRef.current, kf.properties);
        } else {
          const prev = sorted[idx - 1];
          const segDuration = Math.max(0.05, kf.time - prev.time);
          tl.to(
            animTargetRef.current,
            {
              ...kf.properties,
              duration: segDuration,
              ease: kf.easing || "power1.inOut",
            },
            prev.time,
          );
        }
      });

      timelineRef.current = tl;
    },
    { dependencies: [keyframes, totalDuration, isLoop], scope: previewBoxRef },
  );

  const handlePlayPause = () => {
    if (!timelineRef.current) return;
    if (isPlaying) {
      timelineRef.current.pause();
      setIsPlaying(false);
    } else {
      if (timelineRef.current.progress() >= 1) {
        timelineRef.current.restart();
      } else {
        timelineRef.current.play();
      }
      setIsPlaying(true);
    }
  };

  const handleScrub = (val: number) => {
    setProgress(val);
    if (timelineRef.current) {
      timelineRef.current.pause();
      timelineRef.current.progress(val);
      setIsPlaying(false);
    }
  };

  const handleAddKeyframe = () => {
    const newTime = Number((progress * totalDuration).toFixed(2));
    const newKf: CustomKeyframe = {
      time: newTime,
      properties: { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 },
      easing: "power1.out",
    };
    const updated = [...keyframes, newKf].sort((a, b) => a.time - b.time);
    setKeyframes(updated);
    setSelectedKfIndex(updated.findIndex((k) => k.time === newTime));
  };

  const handleDeleteKeyframe = (index: number) => {
    if (keyframes.length <= 2) {
      alert("A custom timeline requires at least 2 keyframes.");
      return;
    }
    const updated = keyframes.filter((_, idx) => idx !== index);
    setKeyframes(updated);
    setSelectedKfIndex(Math.max(0, index - 1));
  };

  const handleUpdateProperty = (propKey: string, val: number) => {
    const updated = [...keyframes];
    updated[selectedKfIndex] = {
      ...updated[selectedKfIndex],
      properties: {
        ...updated[selectedKfIndex].properties,
        [propKey]: val,
      },
    };
    setKeyframes(updated);
  };

  const handleSaveAndClose = () => {
    const updatedConfig: AnimationConfig = {
      ...(existingAnim || {
        trigger: "onMount",
        preset: "custom",
        duration: 1000,
      }),
      preset: "custom",
      duration: Math.round(totalDuration * 1000),
      loop: isLoop,
      customKeyframes: keyframes,
    };
    onSave(updatedConfig);
    onClose();
  };

  if (!isOpen) return null;

  const currentKf = keyframes[selectedKfIndex] || keyframes[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in select-none text-[#2D3748]">
      <div className="w-full max-w-4xl bg-white border border-[#E2E8F0] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2F6FED]/10 border border-[#2F6FED]/20 flex items-center justify-center text-[#2F6FED]">
              <i className="fa-solid fa-timeline text-lg" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D3748]">
                GSAP Keyframe Sequencer
              </h2>
              <p className="text-xs text-[#64748B]">
                Authoring custom animation for{" "}
                <span className="text-[#2F6FED] font-semibold">
                  {element.name}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-[#F0F2F5] border border-[#E2E8F0] text-[#64748B] hover:text-[#2D3748] flex items-center justify-center transition-colors cursor-pointer shadow-sm"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div
          ref={previewBoxRef}
          className="h-64 bg-[#F0F2F5] flex items-center justify-center relative overflow-hidden border-b border-[#E2E8F0]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          {/* Centered Guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
            <div className="w-48 h-48 border border-dashed border-[#2F6FED] rounded-2xl" />
          </div>

          {/* Animated Target */}
          <div ref={animTargetRef} className="w-44 h-16 relative">
            <RenderedElement element={element} mode="preview" />
          </div>

          {/* Timeline Time Badge */}
          <div className="absolute top-4 right-4 px-3 py-1 rounded-xl bg-white border border-[#E2E8F0] font-mono text-xs text-[#2F6FED] font-bold shadow-sm">
            {(progress * totalDuration).toFixed(2)}s /{" "}
            {totalDuration.toFixed(2)}s
          </div>
        </div>

        {/* Scrubber & Playback Controls Bar */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-md transition-all cursor-pointer ${
              isPlaying
                ? "bg-[#D97706] hover:bg-[#B45309] text-white"
                : "bg-[#2F6FED] hover:bg-[#2557BC] text-white"
            }`}
          >
            <i className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"}`} />
          </button>

          {/* Scrubber Range */}
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={progress}
              onChange={(e) => handleScrub(parseFloat(e.target.value))}
              className="w-full accent-[#2F6FED] cursor-pointer h-2 bg-[#E2E8F0] rounded-lg"
            />
          </div>

          {/* Loop & Duration */}
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 text-[#475569] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isLoop}
                onChange={(e) => setIsLoop(e.target.checked)}
                className="rounded text-[#2F6FED] border-[#CBD5E1]"
              />
              Loop
            </label>

            <div className="flex items-center gap-1 bg-white border border-[#CBD5E1] rounded-xl px-2.5 py-1 shadow-sm">
              <span className="text-[#64748B]">Total:</span>
              <input
                type="number"
                step="0.1"
                min="0.2"
                max="10"
                value={totalDuration}
                onChange={(e) =>
                  setTotalDuration(
                    Math.max(0.2, parseFloat(e.target.value) || 1),
                  )
                }
                className="w-12 bg-transparent text-[#2D3748] font-mono text-xs font-bold focus:outline-none"
              />
              <span className="text-[#94A3B8]">s</span>
            </div>

            <button
              onClick={handleAddKeyframe}
              className="px-3 py-1.5 rounded-xl bg-[#2F6FED] hover:bg-[#2557BC] text-white font-semibold text-xs flex items-center gap-1 shadow-md cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              Keyframe
            </button>
          </div>
        </div>

        {/* Timeline Keyframe Track & Property Editor */}
        <div className="flex-1 p-6 grid grid-cols-3 gap-6 overflow-y-auto custom-scrollbar bg-white">
          {/* Left 1/3: Keyframe Track List */}
          <div className="space-y-2 border-r border-[#E2E8F0] pr-4">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-2">
              Keyframe Track ({keyframes.length})
            </span>

            <div className="space-y-1.5">
              {keyframes.map((kf, idx) => {
                const isSelected = selectedKfIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedKfIndex(idx);
                      handleScrub(kf.time / totalDuration);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[#2F6FED]/10 border-[#2F6FED] text-[#2F6FED] font-bold shadow-sm"
                        : "bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#2D3748] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSelected
                            ? "bg-[#2F6FED] shadow-[0_0_8px_rgba(47,111,237,0.8)]"
                            : "bg-[#CBD5E1]"
                        }`}
                      />
                      <span className="text-xs font-mono font-semibold">
                        KF #{idx + 1} ({kf.time.toFixed(2)}s)
                      </span>
                    </div>

                    {keyframes.length > 2 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteKeyframe(idx);
                        }}
                        className="text-[#94A3B8] hover:text-[#EF4444] p-1 cursor-pointer"
                        title="Delete keyframe"
                      >
                        <i className="fa-regular fa-trash-can text-xs" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 2/3: Per-Keyframe Property Controls */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#2F6FED] uppercase tracking-wider">
                Editing KF #{selectedKfIndex + 1} Properties (
                {currentKf.time.toFixed(2)}s)
              </span>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#64748B]">Timestamp:</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max={totalDuration}
                  value={currentKf.time}
                  onChange={(e) => {
                    const newTime = Math.max(
                      0,
                      Math.min(totalDuration, parseFloat(e.target.value) || 0),
                    );
                    const updated = [...keyframes];
                    updated[selectedKfIndex] = {
                      ...updated[selectedKfIndex],
                      time: newTime,
                    };
                    setKeyframes(updated.sort((a, b) => a.time - b.time));
                  }}
                  className="w-16 bg-white border border-[#CBD5E1] px-2 py-1 rounded-lg text-[#2D3748] font-mono text-xs font-bold focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
                <span className="text-[#94A3B8]">s</span>
              </div>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
              {/* Translate X */}
              <div>
                <label className="text-[11px] text-[#64748B] font-medium block mb-1">
                  Translate X (px)
                </label>
                <input
                  type="number"
                  value={currentKf.properties.x ?? 0}
                  onChange={(e) =>
                    handleUpdateProperty("x", parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-white border border-[#CBD5E1] px-2.5 py-1.5 rounded-xl text-xs text-[#2D3748] font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
              </div>

              {/* Translate Y */}
              <div>
                <label className="text-[11px] text-[#64748B] font-medium block mb-1">
                  Translate Y (px)
                </label>
                <input
                  type="number"
                  value={currentKf.properties.y ?? 0}
                  onChange={(e) =>
                    handleUpdateProperty("y", parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-white border border-[#CBD5E1] px-2.5 py-1.5 rounded-xl text-xs text-[#2D3748] font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
              </div>

              {/* Scale */}
              <div>
                <label className="text-[11px] text-[#64748B] font-medium block mb-1">
                  Scale Multiplier
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="3"
                  value={currentKf.properties.scale ?? 1}
                  onChange={(e) =>
                    handleUpdateProperty(
                      "scale",
                      parseFloat(e.target.value) || 1,
                    )
                  }
                  className="w-full bg-white border border-[#CBD5E1] px-2.5 py-1.5 rounded-xl text-xs text-[#2D3748] font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
              </div>

              {/* Rotation */}
              <div>
                <label className="text-[11px] text-[#64748B] font-medium block mb-1">
                  Rotation (°)
                </label>
                <input
                  type="number"
                  step="5"
                  value={currentKf.properties.rotate ?? 0}
                  onChange={(e) =>
                    handleUpdateProperty(
                      "rotate",
                      parseInt(e.target.value) || 0,
                    )
                  }
                  className="w-full bg-white border border-[#CBD5E1] px-2.5 py-1.5 rounded-xl text-xs text-[#2D3748] font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
              </div>

              {/* Opacity */}
              <div>
                <label className="text-[11px] text-[#64748B] font-medium block mb-1">
                  Opacity (0 to 1)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={currentKf.properties.opacity ?? 1}
                  onChange={(e) =>
                    handleUpdateProperty(
                      "opacity",
                      parseFloat(e.target.value) || 1,
                    )
                  }
                  className="w-full bg-white border border-[#CBD5E1] px-2.5 py-1.5 rounded-xl text-xs text-[#2D3748] font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
              </div>

              {/* Easing */}
              <div>
                <label className="text-[11px] text-[#64748B] font-medium block mb-1">
                  Interpolation Easing
                </label>
                <select
                  value={currentKf.easing || "power1.out"}
                  onChange={(e) => {
                    const updated = [...keyframes];
                    updated[selectedKfIndex] = {
                      ...updated[selectedKfIndex],
                      easing: e.target.value,
                    };
                    setKeyframes(updated);
                  }}
                  className="w-full bg-white border border-[#CBD5E1] p-1.5 rounded-xl text-xs text-[#2D3748] focus:outline-none focus:border-[#2F6FED] shadow-sm cursor-pointer"
                >
                  <option value="power1.out">Ease Out (Decelerate)</option>
                  <option value="power1.in">Ease In (Accelerate)</option>
                  <option value="power1.inOut">Ease In-Out (Smooth)</option>
                  <option value="bounce.out">Bounce</option>
                  <option value="elastic.out(1, 0.3)">Elastic</option>
                  <option value="none">Linear</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F0F2F5] text-[#64748B] hover:text-[#2D3748] font-semibold text-xs cursor-pointer shadow-sm"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveAndClose}
            className="px-6 py-2 rounded-xl bg-[#2F6FED] hover:bg-[#2557BC] text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer"
          >
            <i className="fa-solid fa-check" />
            Apply Keyframes to Element
          </button>
        </div>
      </div>
    </div>
  );
};
