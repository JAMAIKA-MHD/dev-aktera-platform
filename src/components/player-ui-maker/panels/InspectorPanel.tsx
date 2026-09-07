import React, { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useEditorStore } from "../store/useEditorStore";
import {
  AnchorType,
  AnimationConfig,
  AnimationPreset,
  AnimationTrigger,
  ScaleMode,
  Transform,
} from "../types";
import { isFieldLocked } from "../utils/transformUtils";
import { SOFT_UI_THEME } from "../theme/tokens";

const COLOR_SWATCHES = [
  "#2F6FED", // Royal Blue
  "#3B82F6", // Blue
  "#60A5FA", // Light Blue
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#FFFFFF", // White
  "#F0F2F5", // Soft UI Bg
  "#CBD5E1", // Light Slate
  "#64748B", // Neutral Slate
  "#2D3748", // Dark Slate
];

const GRADIENT_PRESETS = [
  {
    label: "Soft Silver",
    value: "linear-gradient(180deg, #F0F2F5 0%, #E2E8F0 100%)",
  },
  {
    label: "Sky Pearl",
    value: "linear-gradient(180deg, #FFFFFF 0%, #EBF2FE 100%)",
  },
  {
    label: "Clean White",
    value: "linear-gradient(180deg, #FFFFFF 0%, #F1F4F9 100%)",
  },
  {
    label: "Soft Blue",
    value: "linear-gradient(180deg, #EBF2FE 0%, #DBEAFE 100%)",
  },
  {
    label: "Frosted Slate",
    value: "linear-gradient(180deg, #F8FAFC 0%, #EDF2F7 100%)",
  },
  {
    label: "Ice Tint",
    value: "linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%)",
  },
];

const WALLPAPER_PRESETS = [
  {
    label: "Clean Light",
    url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Soft Mesh",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Abstract Pearl",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "Minimal White",
    url: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80",
  },
];

const GRAPHIC_PRESETS = [
  {
    label: "Logo",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
  },
  {
    label: "Gift Box",
    url: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=200&auto=format&fit=crop&q=80",
  },
  {
    label: "Trophy",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80",
  },
  {
    label: "Coin",
    url: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=200&auto=format&fit=crop&q=80",
  },
];

const POPULAR_ICONS = [
  { name: "Star", class: "fa-solid fa-star" },
  { name: "Trophy", class: "fa-solid fa-trophy" },
  { name: "Gift", class: "fa-solid fa-gift" },
  { name: "Fire", class: "fa-solid fa-fire" },
  { name: "Sparkles", class: "fa-solid fa-wand-magic-sparkles" },
  { name: "Gamepad", class: "fa-solid fa-gamepad" },
  { name: "Crown", class: "fa-solid fa-crown" },
  { name: "Coin", class: "fa-solid fa-coins" },
  { name: "Heart", class: "fa-solid fa-heart" },
  { name: "Check", class: "fa-solid fa-circle-check" },
  { name: "Bell", class: "fa-solid fa-bell" },
  { name: "Rocket", class: "fa-solid fa-rocket" },
];

const AVAILABLE_BINDINGS = [
  { value: "", label: "None (Static Content)" },
  { value: "player.name", label: "Player Name" },
  { value: "player.phone", label: "Player Phone Number" },
  { value: "player.score", label: "Player Score" },
  { value: "game.timer", label: "Game Timer / Countdown" },
  { value: "game.turns", label: "Spins / Turns Left" },
  { value: "prize.title", label: "Won Reward Title" },
  { value: "prize.code", label: "Coupon Voucher Code" },
  { value: "game.start", label: "Start Game (CTA Trigger)" },
  { value: "prize.claim", label: "Claim Prize (CTA Trigger)" },
];

const ANCHOR_OPTIONS: { value: AnchorType; label: string }[] = [
  { value: "topLeft", label: "Top Left" },
  { value: "topCenter", label: "Top Center" },
  { value: "topRight", label: "Top Right" },
  { value: "centerLeft", label: "Center Left" },
  { value: "center", label: "Center" },
  { value: "centerRight", label: "Center Right" },
  { value: "bottomLeft", label: "Bottom Left" },
  { value: "bottomCenter", label: "Bottom Center" },
  { value: "bottomRight", label: "Bottom Right" },
];

const SCALE_MODE_OPTIONS: { value: ScaleMode; label: string }[] = [
  { value: "preserve-aspect", label: "Preserve Aspect (vmin basis)" },
  { value: "stretch", label: "Stretch to Box" },
  { value: "fit-width", label: "Fit Width" },
  { value: "fit-height", label: "Fit Height" },
];

interface InspectorPanelProps {
  onOpenTimelineEditor?: (elementId: string, animIndex: number) => void;
  onToggleCollapse?: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  onOpenTimelineEditor,
  onToggleCollapse,
}) => {
  const {
    project,
    activeScreen,
    selectedIds,
    updateElement,
    updateElementTransform,
    setScreenBackground,
    mockData,
    setMockData,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<
    "style" | "content" | "transform" | "animations"
  >("style");
  const [showColorPicker, setShowColorPicker] = useState<
    "bg" | "text" | "screenBg" | null
  >(null);
  const [isDraggingBg, setIsDraggingBg] = useState(false);

  const bgFileInputRef = React.useRef<HTMLInputElement>(null);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleBgFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setScreenBackground(activeScreen, { type: "image", value: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const screen = project.screens[activeScreen];
  const selectedElement =
    selectedIds.length === 1
      ? screen?.elements.find((el) => el.id === selectedIds[0])
      : null;

  // 1. SCREEN PROPERTIES (When nothing is selected)
  if (!selectedElement) {
    const bgType = screen?.background?.type || "color";

    return (
      <aside className="w-80 h-full bg-white border-l border-slate-200/90 flex flex-col select-none overflow-y-auto custom-scrollbar shrink-0 text-slate-800">
        {/* Hidden File Input for Background Image */}
        <input
          ref={bgFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBgFileSelected}
        />

        <div className="h-12 px-4 border-b border-slate-200/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-sliders text-[#2F6FED] text-xs" />
            <span className="font-semibold text-xs text-slate-800 uppercase tracking-wider">
              Screen Settings
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2F6FED] font-mono text-[10px] uppercase font-bold border border-blue-200">
              {activeScreen}
            </span>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                title="Hide Inspector Sidebar"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-5 text-xs">
          {/* Background Mode Selector */}
          <div className="space-y-3">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Screen Background
            </label>

            <div className="grid grid-cols-3 gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              {(["color", "gradient", "image"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() =>
                    setScreenBackground(activeScreen, {
                      type: mode,
                      value:
                        mode === "color"
                          ? SOFT_UI_THEME.colors.bg
                          : mode === "gradient"
                            ? GRADIENT_PRESETS[0].value
                            : WALLPAPER_PRESETS[0].url,
                    })
                  }
                  className={`py-1.5 rounded-lg text-xs capitalize font-semibold transition-all cursor-pointer ${
                    bgType === mode
                      ? "bg-[#2F6FED] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  }`}
                >
                  {mode === "color" ? (
                    <span className="flex items-center justify-center gap-1">
                      <i className="fa-solid fa-palette text-[10px]" />
                      <span>Color</span>
                    </span>
                  ) : mode === "gradient" ? (
                    <span className="flex items-center justify-center gap-1">
                      <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
                      <span>Gradient</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <i className="fa-solid fa-image text-[10px]" />
                      <span>Picture</span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Solid Color Mode */}
            {bgType === "color" && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setShowColorPicker(
                        showColorPicker === "screenBg" ? null : "screenBg",
                      )
                    }
                    style={{
                      backgroundColor:
                        screen?.background?.value || SOFT_UI_THEME.colors.bg,
                    }}
                    className="w-8 h-8 rounded-lg border border-slate-300 shadow-sm shrink-0 cursor-pointer"
                    title="Choose color"
                  />
                  <input
                    type="text"
                    value={screen?.background?.value || SOFT_UI_THEME.colors.bg}
                    onChange={(e) =>
                      setScreenBackground(activeScreen, {
                        type: "color",
                        value: e.target.value,
                      })
                    }
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                  />
                </div>

                {showColorPicker === "screenBg" && (
                  <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-md">
                    <HexColorPicker
                      color={
                        screen?.background?.value || SOFT_UI_THEME.colors.bg
                      }
                      onChange={(col) =>
                        setScreenBackground(activeScreen, {
                          type: "color",
                          value: col,
                        })
                      }
                    />
                  </div>
                )}

                {/* Quick Color Swatches */}
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">
                    Click a swatch:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        onClick={() =>
                          setScreenBackground(activeScreen, {
                            type: "color",
                            value: swatch,
                          })
                        }
                        style={{ backgroundColor: swatch }}
                        className="w-5 h-5 rounded-md border border-slate-200 hover:scale-110 transition-transform shadow-xs cursor-pointer"
                        title={swatch}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Gradient Mode */}
            {bgType === "gradient" && (
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 block">
                  Click a gradient style:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENT_PRESETS.map((gp) => (
                    <button
                      key={gp.label}
                      onClick={() =>
                        setScreenBackground(activeScreen, {
                          type: "gradient",
                          value: gp.value,
                        })
                      }
                      style={{ background: gp.value }}
                      className={`h-12 rounded-xl border text-[11px] font-bold text-slate-700 shadow-sm flex items-center justify-center p-1 text-center transition-all cursor-pointer ${
                        screen?.background?.value === gp.value
                          ? "border-[#2F6FED] ring-2 ring-blue-500/25"
                          : "border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {gp.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Custom CSS Gradient
                  </label>
                  <textarea
                    value={screen?.background?.value || ""}
                    onChange={(e) =>
                      setScreenBackground(activeScreen, {
                        type: "gradient",
                        value: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Image Wallpaper Mode */}
            {bgType === "image" && (
              <div className="space-y-3">
                {/* Drag and Drop Zone + File Picker */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingBg(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingBg(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingBg(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        if (dataUrl) {
                          setScreenBackground(activeScreen, {
                            type: "image",
                            value: dataUrl,
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  onClick={() => bgFileInputRef.current?.click()}
                  className={`relative p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDraggingBg
                      ? "border-[#2F6FED] bg-blue-50 text-[#2F6FED] ring-2 ring-blue-500/25 scale-[1.02]"
                      : "border-slate-300 hover:border-[#2F6FED] bg-slate-50 hover:bg-blue-50/50 text-slate-700"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2F6FED] mb-2 shadow-sm">
                    <i className="fa-solid fa-cloud-arrow-up text-lg" />
                  </div>
                  <span className="font-bold text-xs text-slate-800">
                    {isDraggingBg
                      ? "Drop Image to Set Background"
                      : "Choose or Drag Image"}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Click to browse your files or drag & drop here
                  </span>
                  <span className="text-[9px] text-[#2F6FED] font-medium mt-0.5">
                    Supports PNG, JPG, WEBP, SVG, GIF
                  </span>
                </div>

                {/* Active Image Status / Quick Actions */}
                {screen?.background?.value && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                      <img
                        src={screen.background.value}
                        alt="Current background preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-slate-800 truncate">
                        Active Background
                      </div>
                      <div className="text-[9px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                        <i className="fa-solid fa-circle-check text-[8px]" />
                        Loaded Image
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setScreenBackground(activeScreen, {
                          type: "color",
                          value: SOFT_UI_THEME.colors.bg,
                        });
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Clear image and revert to solid color"
                    >
                      <i className="fa-solid fa-trash-can text-xs" />
                    </button>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Or Paste Image URL
                  </label>
                  <input
                    type="text"
                    value={screen?.background?.value || ""}
                    onChange={(e) =>
                      setScreenBackground(activeScreen, {
                        type: "image",
                        value: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">
                    Preset wallpapers:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {WALLPAPER_PRESETS.map((wp) => (
                      <button
                        key={wp.label}
                        onClick={() =>
                          setScreenBackground(activeScreen, {
                            type: "image",
                            value: wp.url,
                          })
                        }
                        className={`h-14 rounded-xl overflow-hidden border relative group shadow-sm transition-all cursor-pointer ${
                          screen?.background?.value === wp.url
                            ? "border-[#2F6FED] ring-2 ring-blue-500/25"
                            : "border-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <img
                          src={wp.url}
                          alt={wp.label}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-end p-1">
                          <span className="text-[8px] font-bold text-white truncate">
                            {wp.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Screen Celebration */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Enter Celebration
            </label>
            <select
              value={screen?.celebrationEffect || "none"}
              onChange={(e) => {
                const nextProject = {
                  ...project,
                  screens: {
                    ...project.screens,
                    [activeScreen]: {
                      ...screen,
                      celebrationEffect: e.target.value as "confetti" | "none",
                    },
                  },
                };
                useEditorStore.getState().loadProject(nextProject);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
            >
              <option value="none">None</option>
              <option value="confetti">🎉 Confetti Burst (Victory)</option>
            </select>
          </div>

          {/* Quick Mock Data Control Preview */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Live Mock Data Preview
            </label>
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {Object.entries(mockData).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-[10px] font-mono text-slate-600 truncate">
                    {key}:
                  </span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setMockData(key, e.target.value)}
                    className="w-28 bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 font-mono text-right focus:outline-none focus:border-[#2F6FED] shadow-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // Helper callbacks
  const isPosLocked = isFieldLocked(selectedElement, "position");
  const isSizeLocked = isFieldLocked(selectedElement, "size");
  const isRotLocked = isFieldLocked(selectedElement, "rotation");
  const isFullyLocked = selectedElement.locked;

  const handleTransformChange = (key: keyof Transform, value: any) => {
    updateElementTransform(activeScreen, selectedElement.id, { [key]: value });
  };

  const handleStyleChange = (styleKey: string, value: any) => {
    updateElement(activeScreen, selectedElement.id, {
      style: {
        ...selectedElement.style,
        [styleKey]: value,
      },
    });
  };

  // 2. DEDICATED LOGO & IMAGE INSPECTOR
  if (selectedElement.type === "image" || selectedElement.type === "avatar") {
    return (
      <aside className="w-80 h-full bg-white border-l border-slate-200/90 flex flex-col select-none overflow-y-auto custom-scrollbar shrink-0 text-slate-800">
        {/* Hidden File Input for Logo Upload */}
        <input
          ref={logoFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              updateElement(activeScreen, selectedElement.id, {
                content: dataUrl,
              });
            };
            reader.readAsDataURL(file);
            e.target.value = "";
          }}
        />

        {/* Header */}
        <div className="h-12 px-4 border-b border-slate-200/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <i className="fa-regular fa-image text-[#2F6FED] text-sm" />
            <span className="font-semibold text-xs text-slate-800 truncate max-w-[140px]">
              {selectedElement.name || "Brand Logo"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                updateElement(activeScreen, selectedElement.id, {
                  locked: !selectedElement.locked,
                })
              }
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                selectedElement.locked
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title={
                selectedElement.locked
                  ? "Unlock element"
                  : "Lock element completely"
              }
            >
              <i
                className={`fa-solid ${selectedElement.locked ? "fa-lock" : "fa-lock-open"}`}
              />
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                title="Hide Inspector Sidebar"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-5 text-xs">
          {/* Image Source & Upload */}
          <div className="space-y-3">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Brand Logo Image
            </label>

            {/* Current Image Preview */}
            <div className="h-28 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center overflow-hidden relative group">
              {selectedElement.content ? (
                <img
                  src={selectedElement.content}
                  alt={selectedElement.name}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="text-slate-400 text-xs flex flex-col items-center">
                  <i className="fa-regular fa-image text-2xl mb-1 opacity-50" />
                  No image selected
                </div>
              )}
            </div>

            {/* Choose from Files Button */}
            <button
              onClick={() => logoFileInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-xl bg-[#2F6FED] hover:bg-[#2558CA] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-folder-open text-xs" />
              <span>Choose Image from My Files</span>
            </button>

            {/* Or Paste URL */}
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">
                Or Image Web Link
              </label>
              <input
                type="text"
                value={selectedElement.content || ""}
                onChange={(e) =>
                  updateElement(activeScreen, selectedElement.id, {
                    content: e.target.value,
                  })
                }
                placeholder="https://..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
              />
            </div>
          </div>

          {/* Resize & Dimensions */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <label className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block">
              Resize & Dimensions
            </label>

            {/* Quick Size Presets */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">
                Size Presets:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Small (20% W)", width: 20, height: 7 },
                  { label: "Medium (32% W)", width: 32, height: 10 },
                  { label: "Large (50% W)", width: 50, height: 14 },
                  { label: "Banner (80% W)", width: 80, height: 18 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      updateElementTransform(activeScreen, selectedElement.id, {
                        size: { width: preset.width, height: preset.height },
                      });
                    }}
                    className="py-1.5 px-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#2F6FED] hover:bg-blue-50 text-[11px] font-semibold text-slate-700 transition-all text-center cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Width Controls */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">
                  Width (% size)
                </span>
                <span className="font-mono text-slate-800 font-bold">
                  {selectedElement.transform.size.width}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    handleTransformChange("size", {
                      ...selectedElement.transform.size,
                      width: Math.max(
                        5,
                        selectedElement.transform.size.width - 2,
                      ),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="100"
                  value={selectedElement.transform.size.width}
                  onChange={(e) =>
                    handleTransformChange("size", {
                      ...selectedElement.transform.size,
                      width: Math.max(5, parseFloat(e.target.value) || 5),
                    })
                  }
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono text-center focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
                <button
                  onClick={() =>
                    handleTransformChange("size", {
                      ...selectedElement.transform.size,
                      width: Math.min(
                        100,
                        selectedElement.transform.size.width + 2,
                      ),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Height Controls */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">
                  Height (% size)
                </span>
                <span className="font-mono text-slate-800 font-bold">
                  {selectedElement.transform.size.height}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    handleTransformChange("size", {
                      ...selectedElement.transform.size,
                      height: Math.max(
                        2,
                        selectedElement.transform.size.height - 1,
                      ),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="100"
                  value={selectedElement.transform.size.height}
                  onChange={(e) =>
                    handleTransformChange("size", {
                      ...selectedElement.transform.size,
                      height: Math.max(2, parseFloat(e.target.value) || 2),
                    })
                  }
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono text-center focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
                <button
                  onClick={() =>
                    handleTransformChange("size", {
                      ...selectedElement.transform.size,
                      height: Math.min(
                        100,
                        selectedElement.transform.size.height + 1,
                      ),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Vertical Placement */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500 font-medium">
                  Vertical Placement (Y)
                </span>
                <span className="font-mono text-slate-800 font-bold">
                  {selectedElement.transform.position.y}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    handleTransformChange("position", {
                      ...selectedElement.transform.position,
                      y: Math.max(0, selectedElement.transform.position.y - 2),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                >
                  ↑
                </button>
                <input
                  type="number"
                  step="1"
                  value={selectedElement.transform.position.y}
                  onChange={(e) =>
                    handleTransformChange("position", {
                      ...selectedElement.transform.position,
                      y: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono text-center focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
                <button
                  onClick={() =>
                    handleTransformChange("position", {
                      ...selectedElement.transform.position,
                      y: Math.min(
                        100,
                        selectedElement.transform.position.y + 2,
                      ),
                    })
                  }
                  className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                >
                  ↓
                </button>
              </div>
            </div>

            {/* Corner Radius */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1">
                Corner Rounding:
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: "0px", val: "0px" },
                  { label: "8px", val: "8px" },
                  { label: "14px", val: "14px" },
                  { label: "Circle", val: "9999px" },
                ].map((rad) => (
                  <button
                    key={rad.val}
                    onClick={() => handleStyleChange("borderRadius", rad.val)}
                    className={`py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      (selectedElement.style.borderRadius as string) === rad.val
                        ? "bg-[#2F6FED] text-white border-[#2F6FED] shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {rad.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 3. OTHER ELEMENTS (Buttons, Text, Panels, Inputs, Icons)
  const handleAddAnimation = () => {
    const newAnim: AnimationConfig = {
      id: `anim-${Date.now()}`,
      trigger: "onMount",
      preset: "fadeIn",
      duration: 400,
      delay: 0,
      loop: false,
    };
    updateElement(activeScreen, selectedElement.id, {
      animations: [...(selectedElement.animations || []), newAnim],
    });
  };

  const handleUpdateAnimation = (
    index: number,
    patch: Partial<AnimationConfig>,
  ) => {
    const next = [...(selectedElement.animations || [])];
    next[index] = { ...next[index], ...patch };
    updateElement(activeScreen, selectedElement.id, { animations: next });
  };

  const handleDeleteAnimation = (index: number) => {
    const next = [...(selectedElement.animations || [])];
    next.splice(index, 1);
    updateElement(activeScreen, selectedElement.id, { animations: next });
  };

  const currentBgColor =
    (selectedElement.style.backgroundColor as string) || "";
  const currentTextColor =
    (selectedElement.style.color as string) || SOFT_UI_THEME.colors.textPrimary;
  const currentFontSize = (selectedElement.style.fontSize as string) || "16px";
  const currentRadius = (selectedElement.style.borderRadius as string) || "0px";

  return (
    <aside className="w-80 h-full bg-white border-l border-slate-200/90 flex flex-col select-none overflow-hidden shrink-0 text-slate-800">
      {/* Header with Name and Lock */}
      <div className="h-12 px-4 border-b border-slate-200/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-xs text-slate-800 truncate max-w-[150px]">
            {selectedElement.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              updateElement(activeScreen, selectedElement.id, {
                locked: !selectedElement.locked,
              })
            }
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              selectedElement.locked
                ? "bg-red-50 text-red-600 border border-red-200"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
            title={
              selectedElement.locked
                ? "Unlock element"
                : "Lock element completely"
            }
          >
            <i
              className={`fa-solid ${selectedElement.locked ? "fa-lock" : "fa-lock-open"}`}
            />
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
              title="Hide Inspector Sidebar"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 p-1 gap-1">
        {(["style", "content", "transform", "animations"] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? "text-[#2F6FED] bg-white shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab === "animations"
                ? `Anim (${selectedElement.animations?.length || 0})`
                : tab}
            </button>
          ),
        )}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
        {/* 1. STYLE TAB */}
        {activeTab === "style" && (
          <div className="space-y-4">
            {/* Background / Main Color */}
            <div>
              <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block mb-1.5">
                {selectedElement.type === "text"
                  ? "Box Fill Color"
                  : "Background Color"}
              </label>

              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() =>
                    setShowColorPicker(showColorPicker === "bg" ? null : "bg")
                  }
                  style={{ backgroundColor: currentBgColor || "#FFFFFF" }}
                  className="w-8 h-8 rounded-lg border border-slate-300 shadow-sm shrink-0 cursor-pointer"
                  title="Color picker"
                />
                <input
                  type="text"
                  value={currentBgColor}
                  onChange={(e) =>
                    handleStyleChange("backgroundColor", e.target.value)
                  }
                  placeholder="e.g. #2F6FED or #FFFFFF"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
              </div>

              {showColorPicker === "bg" && (
                <div className="p-2 mb-2 bg-white border border-slate-200 rounded-xl shadow-md">
                  <HexColorPicker
                    color={currentBgColor || "#2F6FED"}
                    onChange={(col) =>
                      handleStyleChange("backgroundColor", col)
                    }
                  />
                </div>
              )}

              {/* Quick Swatches */}
              <div className="flex flex-wrap gap-1">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    onClick={() => handleStyleChange("backgroundColor", swatch)}
                    style={{ backgroundColor: swatch }}
                    className="w-4 h-4 rounded-md border border-slate-200 hover:scale-125 transition-transform shadow-xs cursor-pointer"
                    title={swatch}
                  />
                ))}
              </div>
            </div>

            {/* Text / Accent Color */}
            <div>
              <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block mb-1.5">
                Text / Foreground Color
              </label>

              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() =>
                    setShowColorPicker(
                      showColorPicker === "text" ? null : "text",
                    )
                  }
                  style={{ backgroundColor: currentTextColor }}
                  className="w-8 h-8 rounded-lg border border-slate-300 shadow-sm shrink-0 cursor-pointer"
                  title="Color picker"
                />
                <input
                  type="text"
                  value={currentTextColor}
                  onChange={(e) => handleStyleChange("color", e.target.value)}
                  placeholder="#2D3748"
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
              </div>

              {showColorPicker === "text" && (
                <div className="p-2 mb-2 bg-white border border-slate-200 rounded-xl shadow-md">
                  <HexColorPicker
                    color={currentTextColor}
                    onChange={(col) => handleStyleChange("color", col)}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    onClick={() => handleStyleChange("color", swatch)}
                    style={{ backgroundColor: swatch }}
                    className="w-4 h-4 rounded-md border border-slate-200 hover:scale-125 transition-transform shadow-xs cursor-pointer"
                    title={swatch}
                  />
                ))}
              </div>
            </div>

            {/* Typography Controls */}
            {(selectedElement.type === "text" ||
              selectedElement.type === "button" ||
              selectedElement.type === "input") && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block">
                  Typography
                </label>

                {/* Font Size Chips + Direct Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-500">
                      Font Size
                    </span>
                    <input
                      type="text"
                      value={currentFontSize}
                      onChange={(e) =>
                        handleStyleChange("fontSize", e.target.value)
                      }
                      className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 text-right font-mono shadow-sm"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      "12px",
                      "14px",
                      "16px",
                      "18px",
                      "22px",
                      "28px",
                      "36px",
                      "48px",
                    ].map((fs) => (
                      <button
                        key={fs}
                        onClick={() => handleStyleChange("fontSize", fs)}
                        className={`py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          currentFontSize === fs
                            ? "bg-[#2F6FED] text-white border-[#2F6FED]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {fs}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Weight */}
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">
                    Font Weight
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: "Regular", val: "400" },
                      { label: "Medium", val: "500" },
                      { label: "Bold", val: "700" },
                    ].map((fw) => (
                      <button
                        key={fw.val}
                        onClick={() => handleStyleChange("fontWeight", fw.val)}
                        className={`py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          (selectedElement.style.fontWeight as string) ===
                          fw.val
                            ? "bg-[#2F6FED] text-white border-[#2F6FED]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {fw.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Alignment */}
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">
                    Alignment
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { icon: "fa-align-left", val: "left" },
                      { icon: "fa-align-center", val: "center" },
                      { icon: "fa-align-right", val: "right" },
                    ].map((align) => (
                      <button
                        key={align.val}
                        onClick={() =>
                          handleStyleChange("textAlign", align.val)
                        }
                        className={`py-1.5 rounded-lg text-xs border transition-all cursor-pointer ${
                          (selectedElement.style.textAlign as string) ===
                          align.val
                            ? "bg-[#2F6FED] text-white border-[#2F6FED]"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800"
                        }`}
                      >
                        <i className={`fa-solid ${align.icon}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Corner Radius */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  Corner Radius
                </label>
                <input
                  type="text"
                  value={currentRadius}
                  onChange={(e) =>
                    handleStyleChange("borderRadius", e.target.value)
                  }
                  className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 text-right font-mono shadow-sm"
                />
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: "0px", val: "0px" },
                  { label: "8px", val: "8px" },
                  { label: "16px", val: "16px" },
                  { label: "24px", val: "24px" },
                  { label: "Pill", val: "9999px" },
                ].map((rad) => (
                  <button
                    key={rad.val}
                    onClick={() => handleStyleChange("borderRadius", rad.val)}
                    className={`py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      currentRadius === rad.val
                        ? "bg-[#2F6FED] text-white border-[#2F6FED]"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {rad.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Border & Shadow */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Border Width
                  </label>
                  <input
                    type="text"
                    value={
                      (selectedElement.style.borderWidth as string) || "0px"
                    }
                    onChange={(e) =>
                      handleStyleChange("borderWidth", e.target.value)
                    }
                    placeholder="1px"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Border Color
                  </label>
                  <input
                    type="text"
                    value={(selectedElement.style.borderColor as string) || ""}
                    onChange={(e) =>
                      handleStyleChange("borderColor", e.target.value)
                    }
                    placeholder="#E2E8F0"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">
                  Box Shadow
                </label>
                <input
                  type="text"
                  value={(selectedElement.style.boxShadow as string) || ""}
                  onChange={(e) =>
                    handleStyleChange("boxShadow", e.target.value)
                  }
                  placeholder="0 8px 24px rgba(0,0,0,0.06)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2F6FED] shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. CONTENT & ASSETS TAB */}
        {activeTab === "content" && (
          <div className="space-y-4">
            {/* Layer Name */}
            <div>
              <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block mb-1">
                Layer Name
              </label>
              <input
                type="text"
                value={selectedElement.name}
                onChange={(e) =>
                  updateElement(activeScreen, selectedElement.id, {
                    name: e.target.value,
                  })
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
              />
            </div>

            {/* Display Text / Button Label */}
            <div>
              <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block mb-1">
                {selectedElement.type === "button"
                  ? "Button Label"
                  : selectedElement.type === "input"
                    ? "Placeholder Text"
                    : "Text Content"}
              </label>
              <textarea
                value={selectedElement.content || ""}
                onChange={(e) =>
                  updateElement(activeScreen, selectedElement.id, {
                    content: e.target.value,
                  })
                }
                rows={2}
                placeholder="Enter content..."
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
              />
            </div>

            {/* Icon Picker */}
            {(selectedElement.type === "icon" ||
              selectedElement.type === "button" ||
              selectedElement.type === "text") && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block">
                  Icon (Click to Choose)
                </label>

                <div className="grid grid-cols-6 gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  {POPULAR_ICONS.map((ic) => (
                    <button
                      key={ic.name}
                      onClick={() =>
                        updateElement(activeScreen, selectedElement.id, {
                          iconName: ic.class,
                        })
                      }
                      className={`h-9 rounded-lg flex items-center justify-center text-sm transition-all cursor-pointer ${
                        selectedElement.iconName === ic.class
                          ? "bg-[#2F6FED] text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 hover:bg-white"
                      }`}
                      title={ic.name}
                    >
                      <i className={ic.class} />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500">Class:</span>
                  <input
                    type="text"
                    value={selectedElement.iconName || ""}
                    onChange={(e) =>
                      updateElement(activeScreen, selectedElement.id, {
                        iconName: e.target.value,
                      })
                    }
                    placeholder="fa-solid fa-star"
                    className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 font-mono focus:outline-none shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Data Binding */}
            <div className="pt-3 border-t border-slate-200">
              <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block mb-1">
                Dynamic Data Binding
              </label>
              <select
                value={selectedElement.binding || ""}
                onChange={(e) =>
                  updateElement(activeScreen, selectedElement.id, {
                    binding: e.target.value || undefined,
                  })
                }
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
              >
                {AVAILABLE_BINDINGS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>

              {selectedElement.binding && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-[11px]">
                  <span className="text-[#2F6FED] font-medium">Live Mock:</span>
                  <span className="font-mono text-slate-800 font-semibold">
                    {mockData[selectedElement.binding] !== undefined
                      ? String(mockData[selectedElement.binding])
                      : "(Empty)"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. TRANSFORM TAB */}
        {activeTab === "transform" && (
          <div className="space-y-4">
            {/* Position */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  Position (% of canvas)
                </label>
                {isPosLocked && (
                  <span className="text-[10px] text-amber-500 font-mono">
                    🔒 Locked
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-[#2F6FED] shadow-sm">
                  <span className="text-slate-400 text-[11px] mr-1.5">X:</span>
                  <input
                    type="number"
                    step="0.5"
                    disabled={isPosLocked || isFullyLocked}
                    value={selectedElement.transform.position.x}
                    onChange={(e) =>
                      handleTransformChange("position", {
                        ...selectedElement.transform.position,
                        x: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-transparent text-slate-800 font-mono text-xs focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-slate-400 text-[10px]">%</span>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-[#2F6FED] shadow-sm">
                  <span className="text-slate-400 text-[11px] mr-1.5">Y:</span>
                  <input
                    type="number"
                    step="0.5"
                    disabled={isPosLocked || isFullyLocked}
                    value={selectedElement.transform.position.y}
                    onChange={(e) =>
                      handleTransformChange("position", {
                        ...selectedElement.transform.position,
                        y: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-transparent text-slate-800 font-mono text-xs focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-slate-400 text-[10px]">%</span>
                </div>
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  Dimensions (% of canvas)
                </label>
                {isSizeLocked && (
                  <span className="text-[10px] text-amber-500 font-mono">
                    🔒 Locked
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-[#2F6FED] shadow-sm">
                  <span className="text-slate-400 text-[11px] mr-1.5">W:</span>
                  <input
                    type="number"
                    step="0.5"
                    disabled={isSizeLocked || isFullyLocked}
                    value={selectedElement.transform.size.width}
                    onChange={(e) =>
                      handleTransformChange("size", {
                        ...selectedElement.transform.size,
                        width: Math.max(1, parseFloat(e.target.value) || 1),
                      })
                    }
                    className="w-full bg-transparent text-slate-800 font-mono text-xs focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-slate-400 text-[10px]">%</span>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-[#2F6FED] shadow-sm">
                  <span className="text-slate-400 text-[11px] mr-1.5">H:</span>
                  <input
                    type="number"
                    step="0.5"
                    disabled={isSizeLocked || isFullyLocked}
                    value={selectedElement.transform.size.height}
                    onChange={(e) =>
                      handleTransformChange("size", {
                        ...selectedElement.transform.size,
                        height: Math.max(1, parseFloat(e.target.value) || 1),
                      })
                    }
                    className="w-full bg-transparent text-slate-800 font-mono text-xs focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-slate-400 text-[10px]">%</span>
                </div>
              </div>
            </div>

            {/* Rotation & Z-Index */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block mb-1">
                  Rotation (°)
                </label>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-[#2F6FED] shadow-sm">
                  <input
                    type="number"
                    disabled={isRotLocked || isFullyLocked}
                    value={selectedElement.transform.rotation || 0}
                    onChange={(e) =>
                      handleTransformChange(
                        "rotation",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full bg-transparent text-slate-800 font-mono text-xs focus:outline-none disabled:opacity-40"
                  />
                  <span className="text-slate-400 text-[10px]">deg</span>
                </div>
              </div>

              <div>
                <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block mb-1">
                  Z-Index
                </label>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-[#2F6FED] shadow-sm">
                  <input
                    type="number"
                    value={selectedElement.transform.zIndex || 1}
                    onChange={(e) =>
                      handleTransformChange(
                        "zIndex",
                        parseInt(e.target.value) || 1,
                      )
                    }
                    className="w-full bg-transparent text-slate-800 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Anchor dropdown */}
            <div>
              <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block mb-1">
                Anchor Alignment
              </label>
              <select
                disabled={isPosLocked || isFullyLocked}
                value={selectedElement.transform.anchor || "center"}
                onChange={(e) =>
                  handleTransformChange("anchor", e.target.value as AnchorType)
                }
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm disabled:opacity-40"
              >
                {ANCHOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Scale Mode */}
            <div>
              <label className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider block mb-1">
                Multi-Resolution Scaling
              </label>
              <select
                value={selectedElement.transform.scaleMode || "preserve-aspect"}
                onChange={(e) =>
                  handleTransformChange(
                    "scaleMode",
                    e.target.value as ScaleMode,
                  )
                }
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
              >
                {SCALE_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 4. ANIMATIONS TAB */}
        {activeTab === "animations" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                Configured Effects
              </span>
              <button
                onClick={handleAddAnimation}
                className="px-2.5 py-1 rounded-lg bg-[#2F6FED] hover:bg-[#2558CA] text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <i className="fa-solid fa-plus text-[10px]" />
                Add Effect
              </button>
            </div>

            {!selectedElement.animations ||
            selectedElement.animations.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                <i className="fa-solid fa-wand-magic-sparkles text-xl mb-1.5 opacity-40 block" />
                No animations configured.
                <br />
                Click + Add Effect to attach motion.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedElement.animations.map((anim, idx) => (
                  <div
                    key={anim.id || idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-[11px]">
                        Effect #{idx + 1}
                      </span>
                      <button
                        onClick={() => handleDeleteAnimation(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Delete animation"
                      >
                        <i className="fa-regular fa-trash-can" />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">
                        Trigger
                      </label>
                      <select
                        value={anim.trigger}
                        onChange={(e) =>
                          handleUpdateAnimation(idx, {
                            trigger: e.target.value as AnimationTrigger,
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
                      >
                        <option value="onMount">onMount (Entrance)</option>
                        <option value="onHover">onHover (Cursor)</option>
                        <option value="onClick">onClick (Press)</option>
                        <option value="onGameEvent">
                          onGameEvent (Signal)
                        </option>
                        <option value="onScreenEnter">onScreenEnter</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">
                        Preset
                      </label>
                      <select
                        value={anim.preset}
                        onChange={(e) =>
                          handleUpdateAnimation(idx, {
                            preset: e.target.value as AnimationPreset,
                          })
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#2F6FED] shadow-sm"
                      >
                        <option value="fadeIn">fadeIn (Opacity)</option>
                        <option value="slideIn">slideIn (Offset Slide)</option>
                        <option value="popIn">popIn (Spring Scale)</option>
                        <option value="shake">shake (Jitter)</option>
                        <option value="pulse">pulse (Throbbing)</option>
                        <option value="bounce">bounce (Reward Hop)</option>
                        <option value="custom">custom (GSAP Timeline)</option>
                      </select>
                    </div>

                    {anim.preset === "custom" && (
                      <button
                        onClick={() =>
                          onOpenTimelineEditor?.(selectedElement.id, idx)
                        }
                        className="w-full py-2 bg-[#2F6FED] hover:bg-[#2558CA] text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <i className="fa-solid fa-timeline" />
                        GSAP Timeline ({anim.customKeyframes?.length || 0}{" "}
                        Keyframes)
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Duration (ms)
                        </label>
                        <input
                          type="number"
                          step="50"
                          value={anim.duration || 400}
                          onChange={(e) =>
                            handleUpdateAnimation(idx, {
                              duration: parseInt(e.target.value) || 100,
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono focus:outline-none shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5">
                          Delay (ms)
                        </label>
                        <input
                          type="number"
                          step="50"
                          value={anim.delay || 0}
                          onChange={(e) =>
                            handleUpdateAnimation(idx, {
                              delay: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono focus:outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={anim.loop || false}
                          onChange={(e) =>
                            handleUpdateAnimation(idx, {
                              loop: e.target.checked,
                            })
                          }
                          className="rounded text-[#2F6FED] border-slate-300"
                        />
                        Loop Continuously
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
