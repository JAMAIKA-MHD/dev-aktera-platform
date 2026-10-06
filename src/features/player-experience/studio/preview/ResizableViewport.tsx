import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { applyPointerDelta, clampToEnvelope, type Size } from "./viewportMath";

// The handles of the Responsive mode (plan §9.3): right edge, bottom edge and corner, dragged
// with Pointer Events and pointer capture. While dragging, the iframe must not catch the
// pointer (the parent sets pointer-events: none on it through onDragChange). Handles take the
// focus: arrows resize by 1 px, Shift + arrows by 10 px; a double click fills the room.

type Edge = "right" | "bottom" | "corner";

export interface ResizableViewportProps {
  enabled: boolean;
  size: Size;
  zoom: number;
  room: Size; // what "fill" means, in CSS pixels at this zoom
  onResize: (size: Size) => void;
  onDragChange: (dragging: boolean) => void;
  children: ReactNode;
}

const HANDLE =
  "absolute z-10 flex items-center justify-center rounded-full bg-card-bg text-brand-text-muted shadow-md ring-1 ring-card-border transition hover:bg-blue-600 hover:text-white focus-visible:bg-blue-600 focus-visible:text-white focus-visible:outline-none active:scale-95 touch-none";

export function ResizableViewport({
  enabled,
  size,
  zoom,
  room,
  onResize,
  onDragChange,
  children,
}: ResizableViewportProps) {
  const start = useRef<{ x: number; y: number; size: Size } | null>(null);
  const [dragging, setDragging] = useState(false);

  const down = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY, size };
    setDragging(true);
    onDragChange(true);
    event.preventDefault();
  };
  const move = (edge: Edge) => (event: PointerEvent<HTMLButtonElement>) => {
    const from = start.current;
    if (!from) return;
    onResize(
      applyPointerDelta(
        from.size,
        edge,
        event.clientX - from.x,
        event.clientY - from.y,
        zoom,
      ),
    );
  };
  const up = () => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    onDragChange(false);
  };
  const key = (edge: Edge) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 10 : 1;
    const dx =
      event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
    const dy =
      event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    onResize(applyPointerDelta(size, edge, dx, dy, 1));
  };
  const fill = () => onResize(clampToEnvelope(room));

  const handle = (
    edge: Edge,
    label: string,
    className: string,
    grip: ReactNode,
  ) => (
    <button
      type="button"
      aria-label={label}
      title={`${label} — drag, or use the arrow keys (Shift: 10 px). Double-click to fill.`}
      onPointerDown={down}
      onPointerMove={move(edge)}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key(edge)}
      onDoubleClick={fill}
      className={`${HANDLE} ${className}`}
    >
      {grip}
    </button>
  );

  return (
    <div className="relative size-full">
      {children}
      {enabled && (
        <>
          {handle(
            "right",
            "Resize width",
            "-right-5 top-1/2 h-14 w-3 -translate-y-1/2 cursor-ew-resize",
            <span className="h-6 w-0.5 rounded bg-current" />,
          )}
          {handle(
            "bottom",
            "Resize height",
            "-bottom-5 left-1/2 h-3 w-14 -translate-x-1/2 cursor-ns-resize",
            <span className="h-0.5 w-6 rounded bg-current" />,
          )}
          {handle(
            "corner",
            "Resize both",
            "-bottom-5 -right-5 size-5 cursor-nwse-resize",
            <span className="size-1.5 rounded-full bg-current" />,
          )}
        </>
      )}
      {dragging && (
        <span
          role="status"
          className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-slate-900/85 px-3 py-1 text-sm font-bold tabular-nums text-white shadow-lg"
        >
          {size.width} × {size.height}
        </span>
      )}
    </div>
  );
}
