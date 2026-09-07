import React, { useRef, useMemo } from "react";
import Moveable, { OnDrag, OnResize, OnRotate } from "react-moveable";
import { UIElement, ScreenId } from "../types";
import {
  computeElementPixelRect,
  pixelRectToTransform,
  canDrag,
  canResize,
  canRotate,
  isFieldLocked,
} from "../utils/transformUtils";
import { useEditorStore } from "../store/useEditorStore";
import { RenderedElement } from "../runtime/RenderedElement";

interface CanvasElementProps {
  element: UIElement;
  screenId: ScreenId;
  containerWidth: number;
  containerHeight: number;
  isSelected: boolean;
  isMultiSelected: boolean;
  zoom: number;
}

export const CanvasElement: React.FC<CanvasElementProps> = ({
  element,
  screenId,
  containerWidth,
  containerHeight,
  isSelected,
  zoom,
}) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const updateElementTransform = useEditorStore(
    (s) => s.updateElementTransform,
  );
  const toggleSelectId = useEditorStore((s) => s.toggleSelectId);
  const isSnapToGrid = useEditorStore((s) => s.isSnapToGrid);
  const gridSize = useEditorStore((s) => s.gridSize);
  const mockData = useEditorStore((s) => s.mockData);

  // Compute exact pixel bounding box
  const pixelRect = useMemo(() => {
    return computeElementPixelRect(
      element.transform,
      containerWidth,
      containerHeight,
    );
  }, [element.transform, containerWidth, containerHeight]);

  // Lock checks
  const isDraggable = canDrag(element);
  const isResizable = canResize(element);
  const isRotatable = canRotate(element);
  const isFullyLocked = element.locked;
  const isPosLocked = isFieldLocked(element, "position");

  const handleDrag = ({ left, top }: OnDrag) => {
    if (!isDraggable) return;

    let targetLeft = left;
    let targetTop = top;

    if (isSnapToGrid && gridSize > 0) {
      targetLeft = Math.round(left / gridSize) * gridSize;
      targetTop = Math.round(top / gridSize) * gridSize;
    }

    const updatedTransform = pixelRectToTransform(
      {
        left: targetLeft,
        top: targetTop,
        width: pixelRect.width,
        height: pixelRect.height,
        rotation: pixelRect.rotation,
      },
      element.transform,
      containerWidth,
      containerHeight,
    );

    updateElementTransform(screenId, element.id, updatedTransform);
  };

  const handleResize = ({ width, height, drag }: OnResize) => {
    if (!isResizable) return;

    const updatedTransform = pixelRectToTransform(
      {
        left: drag.left,
        top: drag.top,
        width: Math.max(12, width),
        height: Math.max(12, height),
        rotation: pixelRect.rotation,
      },
      element.transform,
      containerWidth,
      containerHeight,
    );

    updateElementTransform(screenId, element.id, updatedTransform);
  };

  const handleRotate = ({ rotation }: OnRotate) => {
    if (!isRotatable) return;

    const updatedTransform = pixelRectToTransform(
      {
        left: pixelRect.left,
        top: pixelRect.top,
        width: pixelRect.width,
        height: pixelRect.height,
        rotation,
      },
      element.transform,
      containerWidth,
      containerHeight,
    );

    updateElementTransform(screenId, element.id, updatedTransform);
  };

  const handleElementClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelectId(element.id, e.shiftKey || e.metaKey || e.ctrlKey);
  };

  if (element.hidden) {
    return null;
  }

  return (
    <>
      <div
        ref={targetRef}
        id={`element-${element.id}`}
        data-element-id={element.id}
        onClick={handleElementClick}
        style={{
          position: "absolute",
          left: `${pixelRect.left}px`,
          top: `${pixelRect.top}px`,
          width: `${pixelRect.width}px`,
          height: `${pixelRect.height}px`,
          transform: `rotate(${pixelRect.rotation}deg)`,
          transformOrigin: "center center",
          zIndex: pixelRect.zIndex,
          cursor: isFullyLocked
            ? "not-allowed"
            : isPosLocked
              ? "default"
              : "move",
        }}
        className={`group transition-shadow ${
          isSelected
            ? "ring-2 ring-[#2F6FED] shadow-[0_0_12px_rgba(47,111,237,0.35)]"
            : "hover:ring-1 hover:ring-[#2F6FED]/40"
        }`}
      >
        {/* Render element through identical runtime renderer */}
        <RenderedElement element={element} data={mockData} mode="editor" />

        {/* Slot / Lock indicator badge */}
        {(element.slotId || isFullyLocked || isPosLocked) && (
          <div
            className="absolute -top-3.5 left-1 z-30 px-2 py-0.5 rounded-md bg-white border border-[#E2E8F0] text-[9px] font-bold tracking-wider text-[#475569] flex items-center gap-1 shadow-sm pointer-events-none"
            style={{
              transform: `scale(${1 / Math.max(0.7, zoom)})`,
              transformOrigin: "top left",
            }}
          >
            {element.slotId ? (
              <span className="text-[#2F6FED] flex items-center gap-1 font-bold">
                <i className="fa-solid fa-bolt text-[8px]" />
                {element.slotId}
              </span>
            ) : isFullyLocked ? (
              <span className="text-[#EF4444] flex items-center gap-1">
                <i className="fa-solid fa-lock text-[8px]" />
                Locked
              </span>
            ) : (
              <span className="text-[#64748B] flex items-center gap-1">
                <i className="fa-solid fa-thumbtack text-[8px]" />
                Fixed Pos
              </span>
            )}
          </div>
        )}
      </div>

      {/* Moveable Gizmo */}
      {isSelected && (
        <Moveable
          target={targetRef}
          draggable={isDraggable}
          resizable={isResizable}
          rotatable={isRotatable}
          origin={false}
          keepRatio={element.transform.scaleMode === "preserve-aspect"}
          renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
          edge={false}
          zoom={zoom}
          onDrag={handleDrag}
          onResize={handleResize}
          onRotate={handleRotate}
          snappable={isSnapToGrid}
          grid={gridSize}
          className="editor-moveable-gizmo"
        />
      )}
    </>
  );
};
