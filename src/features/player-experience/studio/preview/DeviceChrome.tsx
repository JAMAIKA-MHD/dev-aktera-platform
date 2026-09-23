import { BatteryFull, Lock, Signal, Wifi } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ChromeMetrics } from "./chromeMetrics";

// The shell around the preview iframe (plan §9.3): a phone or tablet body with its status bar,
// or a browser window for a laptop. Its sizes come from chromeMetrics and the viewport, never
// from constants of its own; the screen inside keeps the exact size of the device. The status
// bar follows the experience's dark or light mode, like a real one follows the page.

function useClock(): string {
  const format = () =>
    new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const [time, setTime] = useState(format);
  useEffect(() => {
    const timer = setInterval(() => setTime(format()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return time;
}

function StatusBar({
  height,
  dark,
  overlay,
}: {
  height: number;
  dark: boolean;
  overlay: boolean;
}) {
  const time = useClock();
  return (
    <div
      aria-hidden
      className={`pointer-events-none flex items-center justify-between px-6 text-[12px] font-semibold ${
        overlay ? "absolute inset-x-0 top-0 z-10" : ""
      } ${dark ? "text-white" : "text-slate-900"}`}
      style={{ height }}
    >
      <span className="tabular-nums">{time}</span>
      {overlay && (
        // The notch: an island between the clock and the icons.
        <span className="h-[26px] w-[92px] rounded-full bg-black" />
      )}
      <span className="flex items-center gap-1">
        <Signal className="size-3.5" strokeWidth={2.5} />
        <Wifi className="size-3.5" strokeWidth={2.5} />
        <BatteryFull className="size-4" strokeWidth={2} />
      </span>
    </div>
  );
}

function BrowserToolbar({ height }: { height: number }) {
  return (
    <div
      aria-hidden
      className="flex items-center gap-3 border-b border-slate-200 bg-slate-100 px-3 dark:border-slate-700 dark:bg-slate-800"
      style={{ height }}
    >
      <span className="flex gap-1.5">
        <span className="size-3 rounded-full bg-red-400" />
        <span className="size-3 rounded-full bg-amber-400" />
        <span className="size-3 rounded-full bg-emerald-400" />
      </span>
      <span className="flex h-6 max-w-md flex-1 items-center gap-1.5 rounded-md bg-white px-2.5 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        <Lock className="size-3" />
        play.octoreach.app
      </span>
    </div>
  );
}

export interface DeviceChromeProps {
  metrics: ChromeMetrics;
  width: number; // the screen, in CSS pixels
  height: number;
  dark: boolean; // the experience's mode, for the status bar
  safeTop: number; // height of a status bar drawn over the screen
  safeBottom: number; // room of the home indicator
  children: ReactNode;
}

export function DeviceChrome({
  metrics,
  width,
  height,
  dark,
  safeTop,
  safeBottom,
  children,
}: DeviceChromeProps) {
  const { kind, bezel, top, radius, overlayStatusBar } = metrics;
  const screen = (
    <div
      className="relative overflow-hidden bg-black"
      style={{
        width,
        height,
        borderRadius:
          kind === "none" || kind === "browser"
            ? 0
            : top > 0
              ? `0 0 ${radius - bezel}px ${radius - bezel}px`
              : radius - bezel,
      }}
    >
      {overlayStatusBar && <StatusBar height={safeTop} dark={dark} overlay />}
      {children}
      {kind === "phone" && safeBottom > 0 && (
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-2 left-1/2 z-10 h-[5px] w-[134px] -translate-x-1/2 rounded-full ${
            dark ? "bg-white/80" : "bg-slate-900/80"
          }`}
        />
      )}
    </div>
  );

  if (kind === "none") {
    return <div className="shadow-2xl shadow-slate-900/25">{screen}</div>;
  }
  if (kind === "browser") {
    return (
      <div
        className="overflow-hidden border border-slate-300 bg-white shadow-2xl shadow-slate-900/25 dark:border-slate-600"
        style={{ borderRadius: radius }}
      >
        <BrowserToolbar height={top} />
        {screen}
      </div>
    );
  }
  return (
    <div
      className="relative bg-gradient-to-b from-slate-800 to-slate-950 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.6),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      style={{ padding: bezel, borderRadius: radius }}
    >
      {top > 0 && (
        <div
          className={dark ? "bg-black" : "bg-white"}
          style={{
            borderTopLeftRadius: radius - bezel,
            borderTopRightRadius: radius - bezel,
          }}
        >
          <StatusBar height={top} dark={dark} overlay={false} />
        </div>
      )}
      {screen}
    </div>
  );
}
