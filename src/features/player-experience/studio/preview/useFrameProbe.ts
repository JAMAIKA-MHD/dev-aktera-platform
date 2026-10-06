import { useCallback, useEffect, useRef, useState } from "react";
import { createDemoCampaign } from "../../presets/demoCampaign";
import {
  createStudioBridge,
  type Bridge,
  type FromFrameMessage,
  type ToFrameMessage,
} from "../../runtime/host/previewBridge";
import type { LayoutIssue } from "../../runtime/layout/layoutAudit";
import { useStudioContext } from "../StudioContext";
import type { SizeToCheck } from "./checkSizes";
import type { Size } from "./viewportMath";

// A second, hidden /xp-frame that "Check all sizes" resizes from device to device. It shows
// the screen and language on show in the preview, as a still screen, and answers each size
// with its layout report. A report is taken once the frame has been quiet for a moment:
// entrance animations end, and the audit is re-run after each (layoutReport.ts).

export const PROBE_SETTLE_MS = 500;
export const PROBE_TIMEOUT_MS = 6000;

type Report = Extract<FromFrameMessage, { type: "xp:layout-report" }>;

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

// A promise settled from outside: "the hidden frame is ready", whenever it gets mounted.
function deferred(): Deferred {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

export function useFrameProbe() {
  const { store } = useStudioContext();
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const bridge = useRef<Bridge<ToFrameMessage, FromFrameMessage> | null>(null);
  const ready = useRef<Deferred>(deferred());
  const onReport = useRef<((report: Report) => void) | null>(null);

  useEffect(() => {
    if (!frame) return;
    const current = createStudioBridge(frame);
    bridge.current = current;
    const unsubscribe = current.subscribe((message) => {
      if (message.type === "xp:ready") {
        const { config, campaign } = store.getState();
        current.post({
          type: "xp:config",
          config,
          campaign: campaign ?? createDemoCampaign(config.game.type),
        });
        ready.current.resolve();
      } else if (message.type === "xp:layout-report") {
        onReport.current?.(message);
      }
    });
    return () => {
      unsubscribe();
      bridge.current = null;
    };
  }, [frame, store]);

  const measure = useCallback(
    async (target: SizeToCheck): Promise<LayoutIssue[]> => {
      setSize(target.size);
      await ready.current.promise;
      const { ui } = store.getState();
      return new Promise<LayoutIssue[]>((resolve, reject) => {
        let latest: Report | null = null;
        let settle: ReturnType<typeof setTimeout> | undefined;
        const finish = () => {
          clearTimeout(timeout);
          clearTimeout(settle);
          onReport.current = null;
          if (!latest) return reject(new Error("The frame did not report"));
          resolve([...latest.issues, ...(latest.truncated ?? [])]);
        };
        const timeout = setTimeout(finish, PROBE_TIMEOUT_MS);
        onReport.current = (report) => {
          if (
            report.width !== target.size.width ||
            report.height !== target.size.height
          ) {
            return;
          }
          latest = report;
          clearTimeout(settle);
          settle = setTimeout(finish, PROBE_SETTLE_MS);
        };
        bridge.current?.post({
          type: "xp:ui",
          screen: ui.screen,
          locale: ui.locale,
          mode: "static",
          scenario: ui.scenario,
          safeArea: target.safeArea,
          restartKey: 0,
        });
      });
    },
    [store],
  );

  // The frame goes away with the run; the next run mounts a new one and waits for it.
  const stop = useCallback(() => {
    onReport.current = null;
    ready.current = deferred();
    setSize(null);
  }, []);

  return { frameRef: setFrame, size, measure, stop };
}
