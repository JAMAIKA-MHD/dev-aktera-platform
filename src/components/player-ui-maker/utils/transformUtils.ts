import { AnchorType, Transform, UIElement } from "../types";

export function isFieldLocked(
  element: UIElement,
  field: keyof Transform,
): boolean {
  if (element.locked) return true;
  if (element.softLocked) return true;
  if (element.lockedFields && element.lockedFields.includes(field)) return true;
  return false;
}

export function canDrag(element: UIElement): boolean {
  return !isFieldLocked(element, "position");
}

export function canResize(element: UIElement): boolean {
  return !isFieldLocked(element, "size");
}

export function canRotate(element: UIElement): boolean {
  return !isFieldLocked(element, "rotation");
}

export function getAnchorOffsets(anchor: AnchorType): { x: number; y: number } {
  switch (anchor) {
    case "topLeft":
      return { x: 0, y: 0 };
    case "topCenter":
      return { x: -0.5, y: 0 };
    case "topRight":
      return { x: -1, y: 0 };
    case "centerLeft":
      return { x: 0, y: -0.5 };
    case "center":
      return { x: -0.5, y: -0.5 };
    case "centerRight":
      return { x: -1, y: -0.5 };
    case "bottomLeft":
      return { x: 0, y: -1 };
    case "bottomCenter":
      return { x: -0.5, y: -1 };
    case "bottomRight":
      return { x: -1, y: -1 };
    default:
      return { x: -0.5, y: -0.5 };
  }
}

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

/**
 * Computes exact pixel dimensions for an element inside a canvas container.
 * For 'preserve-aspect', uses min(containerWidth, containerHeight) as basis.
 */
export function computeElementPixelRect(
  transform: Transform,
  containerWidth: number,
  containerHeight: number,
): PixelRect {
  const {
    position,
    size,
    rotation,
    anchor,
    zIndex,
    scaleMode = "stretch",
  } = transform;

  let widthPx = (size.width / 100) * containerWidth;
  let heightPx = (size.height / 100) * containerHeight;

  if (scaleMode === "preserve-aspect") {
    const vmin = Math.min(containerWidth, containerHeight);
    // Scale against single shared basis
    widthPx = (size.width / 100) * vmin;
    heightPx = (size.height / 100) * vmin;
  } else if (scaleMode === "fit-width") {
    widthPx = (size.width / 100) * containerWidth;
    heightPx = widthPx;
  } else if (scaleMode === "fit-height") {
    heightPx = (size.height / 100) * containerHeight;
    widthPx = heightPx;
  }

  // Anchor offset
  const offsets = getAnchorOffsets(anchor);
  const leftPx = (position.x / 100) * containerWidth + offsets.x * widthPx;
  const topPx = (position.y / 100) * containerHeight + offsets.y * heightPx;

  return {
    left: leftPx,
    top: topPx,
    width: Math.max(12, widthPx),
    height: Math.max(12, heightPx),
    rotation: rotation || 0,
    zIndex: zIndex || 1,
  };
}

/**
 * Converts manipulated pixel bounding box back to percentage transform
 */
export function pixelRectToTransform(
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
    rotation?: number;
  },
  currentTransform: Transform,
  containerWidth: number,
  containerHeight: number,
): Transform {
  const { anchor, scaleMode = "stretch" } = currentTransform;
  const offsets = getAnchorOffsets(anchor);

  let newWidthPercent: number;
  let newHeightPercent: number;

  if (scaleMode === "preserve-aspect") {
    const vmin = Math.min(containerWidth, containerHeight);
    newWidthPercent = (rect.width / vmin) * 100;
    newHeightPercent = (rect.height / vmin) * 100;
  } else {
    newWidthPercent = (rect.width / containerWidth) * 100;
    newHeightPercent = (rect.height / containerHeight) * 100;
  }

  // Calculate anchor center position in px
  const rawAnchorX = rect.left - offsets.x * rect.width;
  const rawAnchorY = rect.top - offsets.y * rect.height;

  const newPosX = (rawAnchorX / containerWidth) * 100;
  const newPosY = (rawAnchorY / containerHeight) * 100;

  return {
    ...currentTransform,
    position: {
      x: Number(Math.max(-50, Math.min(150, newPosX)).toFixed(2)),
      y: Number(Math.max(-50, Math.min(150, newPosY)).toFixed(2)),
    },
    size: {
      width: Number(Math.max(1, newWidthPercent).toFixed(2)),
      height: Number(Math.max(1, newHeightPercent).toFixed(2)),
    },
    rotation:
      typeof rect.rotation === "number"
        ? Math.round(rect.rotation)
        : currentTransform.rotation,
  };
}

/**
 * Snapping helper for grid or smart guides
 */
export function snapValue(
  val: number,
  gridSize: number,
  snapTolerance = 5,
): number {
  const nearest = Math.round(val / gridSize) * gridSize;
  return Math.abs(val - nearest) <= snapTolerance ? nearest : val;
}
