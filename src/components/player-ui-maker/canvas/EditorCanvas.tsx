import React, { useRef, useState, useEffect } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { CanvasElement } from "./CanvasElement";
import { CanvasSelecto } from "./CanvasSelecto";
import { DeviceFrame, DeviceFrameType } from "./DeviceFrame";
import { UIElement } from "../types";
import { SOFT_UI_THEME } from "../theme/tokens";

export const EditorCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasFrameRef = useRef<HTMLDivElement>(null);

  const {
    project,
    activeScreen,
    selectedIds,
    zoom,
    canvasResolution,
    isGridVisible,
    gridSize,
    clearSelection,
    addElement,
    setScreenBackground,
  } = useEditorStore();

  const [frameDimensions, setFrameDimensions] = useState({
    width: 420,
    height: 750,
  });
  const [isCanvasFileDragging, setIsCanvasFileDragging] = useState(false);

  // Determine device frame type from resolution
  const deviceType: DeviceFrameType =
    canvasResolution.id === "tablet-4-3"
      ? "tablet"
      : canvasResolution.id === "desktop-1080p"
        ? "desktop"
        : "mobile";

  // Update canvas viewport dimensions based on resolution preset with ResizeObserver
  useEffect(() => {
    const calcDimensions = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;

      const bezelW =
        deviceType === "mobile" ? 24 : deviceType === "tablet" ? 36 : 20;
      const bezelH =
        deviceType === "mobile" ? 72 : deviceType === "tablet" ? 36 : 56;
      const paddingX = clientWidth < 700 ? 16 : 40;
      const paddingY = clientHeight < 650 ? 20 : 50;

      const maxW = Math.max(140, clientWidth - paddingX - bezelW);
      const maxH = Math.max(200, clientHeight - paddingY - bezelH);

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

      // Constrain sizing for realistic phone viewports
      if (
        deviceType === "mobile" &&
        canvasResolution.id === "mobile-portrait"
      ) {
        w = Math.min(390, w);
        h = w / targetAspect;
      }

      setFrameDimensions({
        width: Math.round(w),
        height: Math.round(h),
      });
    };

    calcDimensions();
    const observer = new ResizeObserver(calcDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener("resize", calcDimensions);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", calcDimensions);
    };
  }, [canvasResolution, deviceType]);

  const screen = project.screens[activeScreen] || project.screens.pregame;

  // Background style
  const getBackgroundStyle = (): React.CSSProperties => {
    if (!screen?.background)
      return { backgroundColor: SOFT_UI_THEME.colors.bg };
    const { type, value } = screen.background;
    if (type === "gradient") return { background: value };
    if (type === "color") return { backgroundColor: value };
    if (type === "image")
      return {
        backgroundImage: `url(${value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    return { backgroundColor: SOFT_UI_THEME.colors.bg };
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicked directly on canvas background
    if (e.target === canvasFrameRef.current) {
      clearSelection();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsCanvasFileDragging(true);
    }
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsCanvasFileDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCanvasFileDragging(false);

    // 1. Direct local image file drop onto canvas (sets screen background)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
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
        return;
      }
    }

    // 2. Component Preset drop from layer/library
    const rawPreset = e.dataTransfer.getData("application/json");
    if (!rawPreset || !canvasFrameRef.current) return;

    try {
      const preset: Partial<UIElement> = JSON.parse(rawPreset);
      const rect = canvasFrameRef.current.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;

      const percentX = Number(
        ((dropX / (frameDimensions.width * zoom)) * 100).toFixed(2),
      );
      const percentY = Number(
        ((dropY / (frameDimensions.height * zoom)) * 100).toFixed(2),
      );

      const newElement: UIElement = {
        id: `${preset.type || "el"}-${Date.now()}`,
        type: preset.type || "text",
        name: preset.name || "New Element",
        locked: false,
        transform: {
          position: {
            x: Math.max(5, Math.min(95, percentX)),
            y: Math.max(5, Math.min(95, percentY)),
          },
          size: preset.transform?.size || { width: 20, height: 8 },
          rotation: 0,
          anchor: preset.transform?.anchor || "center",
          zIndex: (screen.elements.length || 0) + 1,
          scaleMode: preset.transform?.scaleMode || "preserve-aspect",
        },
        style: preset.style || {
          color: SOFT_UI_THEME.colors.textPrimary,
          fontSize: "18px",
        },
        content: preset.content || "",
        binding: preset.binding,
        animations: preset.animations || [],
        iconName: preset.iconName,
      };

      addElement(activeScreen, newElement);
    } catch (err) {
      console.error("Failed to parse dropped preset:", err);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full relative overflow-hidden bg-[#F0F2F5] flex items-center justify-center select-none p-4"
      onClick={handleCanvasClick}
    >
      {/* Subtle Dot Grid Pattern */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#CBD5E1 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Outer Scaled Container with Device Frame */}
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
        }}
        className="transition-transform duration-75"
      >
        <DeviceFrame
          deviceType={deviceType}
          width={frameDimensions.width}
          height={frameDimensions.height}
          campaignSlug={project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}
        >
          {/* Inner Interactive Canvas Viewport */}
          <div
            ref={canvasFrameRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              width: `${frameDimensions.width}px`,
              height: `${frameDimensions.height}px`,
              ...getBackgroundStyle(),
            }}
            className="relative w-full h-full overflow-hidden"
          >
            {/* Toggleable Canvas Pixel Grid Overlay */}
            {isGridVisible && (
              <div
                className="absolute inset-0 pointer-events-none z-0 opacity-20"
                style={{
                  backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)`,
                  backgroundSize: `${gridSize}px ${gridSize}px`,
                }}
              />
            )}

            {/* Drag & Drop Visual Overlay when file is dragged over canvas */}
            {isCanvasFileDragging && (
              <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md border-2 border-dashed border-[#2F6FED] flex flex-col items-center justify-center text-[#2F6FED] pointer-events-none animate-fade-in gap-3 p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-md">
                  <i className="fa-solid fa-cloud-arrow-up text-2xl text-[#2F6FED] animate-bounce" />
                </div>
                <div className="text-sm font-bold tracking-wide text-slate-800">
                  Drop Image to Set Background
                </div>
                <div className="text-[11px] text-[#2F6FED] font-medium">
                  Sets screen wallpaper immediately
                </div>
              </div>
            )}

            {/* Render Elements */}
            {screen?.elements.map((el) => (
              <CanvasElement
                key={el.id}
                element={el}
                screenId={activeScreen}
                containerWidth={frameDimensions.width}
                containerHeight={frameDimensions.height}
                isSelected={selectedIds.includes(el.id)}
                isMultiSelected={selectedIds.length > 1}
                zoom={zoom}
              />
            ))}

            {/* Marquee Selecto Overlay */}
            <CanvasSelecto containerRef={canvasFrameRef} />
          </div>
        </DeviceFrame>
      </div>

      {/* Canvas Viewport Dimensions Badge */}
      <div className="absolute bottom-3 left-4 z-20 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 text-[11px] font-mono text-slate-600 hidden sm:flex items-center gap-2 backdrop-blur shadow-sm pointer-events-none">
        <span className="capitalize font-semibold text-[#2F6FED]">
          {deviceType}
        </span>
        <span className="text-slate-300">|</span>
        <span>
          {canvasResolution.width} × {canvasResolution.height}
        </span>
        <span className="text-slate-300">|</span>
        <span>{Math.round(zoom * 100)}%</span>
        <span className="text-slate-300">|</span>
        <span className="text-[#2F6FED] font-semibold">
          {screen?.elements.length || 0} Layers
        </span>
      </div>
    </div>
  );
};
