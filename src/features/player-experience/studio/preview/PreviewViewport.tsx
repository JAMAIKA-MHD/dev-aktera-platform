import { useEffect, useRef, useState } from "react";
import { mostReadable } from "../../domain/contrast";
import type { FlowScreen } from "../../domain/flow";
import {
  computeLayoutMode,
  describeLayoutMode,
} from "../../runtime/layout/layoutMode";
import { useStudio } from "../StudioContext";
import { chromeFor, fitZoom, outerSize } from "./chromeMetrics";
import { DeviceChrome } from "./DeviceChrome";
import { deviceSafeArea, findDevice } from "./devices";
import { usePreviewBridge } from "./usePreviewBridge";

// The preview at the exact size of the device (plan §9.3). The iframe's width and height are
// the device's CSS size, whatever the zoom: inside it, window.innerWidth is 390 on a 390-wide
// phone, so media queries, dvh and fixed elements behave as on the phone. The zoom only
// scales the drawing, around the iframe; the room it takes is reserved at size × zoom, so the
// Studio's own layout stays right. (Not the EditorCanvas way, which shrank the CSS size.)

export const PREVIEW_SRC = "/xp-frame?source=bridge";
const PADDING = 24; // room between the device and the edges of the pane

export interface PreviewViewportProps {
  restartKey: number;
  onFlowScreen?: (screen: FlowScreen) => void;
}

export function PreviewViewport({
  restartKey,
  onFlowScreen,
}: PreviewViewportProps) {
  const viewport = useStudio((state) => state.ui.viewport);
  // The status bar reads on the page color itself, whatever the mode says: a "light" mode
  // kept on dark colors still needs white icons.
  const dark = useStudio(
    (state) =>
      mostReadable(state.config.theme.colors.surface, [
        "#ffffff",
        "#0f172a",
      ]) === "#ffffff",
  );
  const device = findDevice(viewport.deviceId);
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
  const zoom = viewport.zoom === "fit" ? fitZoom(room, outer) : viewport.zoom;

  const iframe = useRef<HTMLIFrameElement>(null);
  usePreviewBridge(iframe, { safeArea, restartKey, onFlowScreen });

  const mode = describeLayoutMode(
    computeLayoutMode(viewport.width, viewport.height),
  );

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
                ref={iframe}
                src={PREVIEW_SRC}
                title="Player screen preview"
                width={viewport.width}
                height={viewport.height}
                className="block border-0 bg-transparent"
              />
            </DeviceChrome>
          </div>
        </div>
      </div>
      <p
        className="flex items-center justify-center gap-2 border-t border-card-border bg-card-bg px-4 py-2 text-[11px] font-semibold tabular-nums text-brand-text-muted"
        aria-live="polite"
      >
        <span className="text-brand-text">
          {viewport.width} × {viewport.height}
        </span>
        <span aria-hidden>·</span>
        <span>{mode}</span>
        <span aria-hidden>·</span>
        <span>{Math.round(zoom * 100)} %</span>
        {device && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{device.label}</span>
          </>
        )}
      </p>
    </div>
  );
}
