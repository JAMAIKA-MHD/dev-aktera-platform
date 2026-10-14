import { useEffect, useRef, useState } from "react";
import { mostReadable } from "../../domain/contrast";
import type { FlowScreen } from "../../domain/flow";
import { useStudio } from "../StudioContext";
import { chromeFor, chromeInsets, outerSize } from "./chromeMetrics";
import { DeviceChrome } from "./DeviceChrome";
import { deviceSafeArea, findDevice, type Device } from "./devices";
import { ResizableViewport } from "./ResizableViewport";
import { usePreviewBridge } from "./usePreviewBridge";
import { computeFitWidthZoom, computeFitZoom } from "./viewportMath";

// The preview at the exact size of the device (plan §9.3). The iframe's width and height are
// the device's CSS size, whatever the zoom: inside it, window.innerWidth is 390 on a 390-wide
// phone, so media queries, dvh and fixed elements behave as on the phone. The zoom only
// scales the drawing, around the iframe; the room it takes is reserved at size × zoom, so the
// Studio's own layout stays right. (Not the EditorCanvas way, which shrank the CSS size.)

export const PREVIEW_SRC = "/xp-frame?source=bridge";
const PADDING = 28; // room between the device and the edges of the pane (and the handles)

export interface PreviewViewportProps {
  restartKey: number;
  customDevices?: readonly Device[];
  onFlowScreen?: (screen: FlowScreen) => void;
  // The zoom on show, for the summary of the device bar (it is "fit" most of the time).
  onZoomChange?: (zoom: number) => void;
}

export function PreviewViewport({
  restartKey,
  customDevices = [],
  onFlowScreen,
  onZoomChange,
}: PreviewViewportProps) {
  const viewport = useStudio((state) => state.ui.viewport);
  const setViewport = useStudio((state) => state.setViewport);
  // The status bar reads on the page color itself, whatever the mode says: a "light" mode
  // kept on dark colors still needs white icons.
  const dark = useStudio(
    (state) =>
      mostReadable(state.config.theme.colors.surface, [
        "#ffffff",
        "#0f172a",
      ]) === "#ffffff",
  );
  const device = findDevice(viewport.deviceId, customDevices);
  const metrics = chromeFor(device, viewport);
  const outer = outerSize(viewport, metrics);
  const safeArea = deviceSafeArea(device, viewport.orientation);

  const area = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = area.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    // The scrolling pane itself, not its content: measuring what the device fills would
    // feed the zoom back into the room it is computed from.
    const observer = new ResizeObserver(() => {
      setRoom({
        width: element.clientWidth - PADDING * 2,
        height: element.clientHeight - PADDING * 2,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // While a handle is dragged, the zoom holds still: a "fit" zoom that shrinks under the
  // pointer would make the drag run away from it.
  const [dragZoom, setDragZoom] = useState<number | null>(null);
  const insets = chromeInsets(metrics);
  const fit = computeFitZoom(viewport, insets, room);
  // "Fit width" fills the width of the pane; a tall screen then scrolls in it.
  const fitWidth = computeFitWidthZoom(viewport, insets, room);
  const zoom =
    dragZoom ??
    (viewport.zoom === "fit"
      ? fit
      : viewport.zoom === "fit-width"
        ? fitWidth
        : viewport.zoom);
  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  const [iframe, setIframe] = useState<HTMLIFrameElement | null>(null);
  usePreviewBridge(iframe, { safeArea, restartKey, onFlowScreen });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={area}
        className="min-h-40 flex-1 overflow-auto bg-[radial-gradient(circle,var(--color-card-border)_1px,transparent_1px)] [background-size:16px_16px]"
        style={{ padding: PADDING }}
      >
        <div
          className="relative mx-auto"
          style={{ width: outer.width * zoom, height: outer.height * zoom }}
          data-xp-preview-zoom={zoom}
        >
          <ResizableViewport
            enabled={viewport.deviceId === null}
            size={viewport}
            zoom={zoom}
            room={{ width: room.width / zoom, height: room.height / zoom }}
            onResize={(size) =>
              setViewport({
                ...size,
                orientation:
                  size.width > size.height ? "landscape" : "portrait",
              })
            }
            onDragChange={(dragging) => setDragZoom(dragging ? zoom : null)}
          >
            <div
              className="absolute left-1/2 top-0"
              style={{
                width: outer.width,
                height: outer.height,
                transform: `translateX(-50%) scale(${zoom})`,
                transformOrigin: "top center",
              }}
            >
              <DeviceChrome
                metrics={metrics}
                width={viewport.width}
                height={viewport.height}
                dark={dark}
                safeTop={safeArea.top}
                safeBottom={safeArea.bottom}
              >
                <iframe
                  ref={setIframe}
                  src={PREVIEW_SRC}
                  title="Player screen preview"
                  width={viewport.width}
                  height={viewport.height}
                  // A dragged handle must keep the pointer: the iframe would swallow it.
                  style={{
                    pointerEvents: dragZoom === null ? undefined : "none",
                  }}
                  className="block border-0 bg-transparent"
                />
              </DeviceChrome>
            </div>
          </ResizableViewport>
        </div>
      </div>
    </div>
  );
}
