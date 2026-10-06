import { CheckCircle2, Loader2, MonitorSmartphone, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IssueRow } from "../validation/IssueRow";
import { useStudio } from "../StudioContext";
import { checkSizes, sizesToCheck, type SizeResult } from "./checkSizes";
import { useCustomDevices } from "./customDevices";
import { DEVICES } from "./devices";
import { PREVIEW_SRC } from "./PreviewViewport";
import { useFrameProbe } from "./useFrameProbe";
import { describeLayoutIssues } from "./useLayoutReport";

// "Check all sizes" (plan §9.3, tasks.md T6.10): the whole catalog, portrait and landscape,
// for the screen and language on show, in a hidden frame. Progress is shown, the run can be
// cancelled, and the results are grouped by device; a click on a problem shows that device
// in the preview and opens the field.

type Run =
  | { status: "idle" }
  | { status: "running"; done: number; total: number }
  | { status: "finished" | "cancelled"; results: SizeResult[]; total: number };

export function CheckAllSizes() {
  const setViewport = useStudio((state) => state.setViewport);
  const custom = useCustomDevices();
  const probe = useFrameProbe();
  const [run, setRun] = useState<Run>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  // Leaving the panel stops the run: its hidden frame goes with it.
  useEffect(() => () => controller.current?.abort(), []);

  const start = async () => {
    const sizes = sizesToCheck([...DEVICES, ...custom.devices]);
    controller.current = new AbortController();
    setRun({ status: "running", done: 0, total: sizes.length });
    // A first, discarded measure: the new frame's screens rise in as it starts, and a block
    // caught mid-way looks like it overlaps another one.
    await probe.measure(sizes[0]).catch(() => []);
    const { results, cancelled } = await checkSizes(sizes, probe.measure, {
      signal: controller.current.signal,
      onProgress: (done) =>
        setRun({ status: "running", done, total: sizes.length }),
    });
    probe.stop();
    setRun({
      status: cancelled ? "cancelled" : "finished",
      results,
      total: sizes.length,
    });
  };

  const broken =
    run.status === "finished" || run.status === "cancelled"
      ? run.results.filter((result) => result.issues.length > 0 || result.error)
      : [];

  return (
    <section
      aria-label="All sizes"
      className="space-y-3 rounded-2xl border border-card-border bg-card-bg p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <MonitorSmartphone
          className="size-5 text-brand-text-muted"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-brand-text">Check all sizes</h3>
          <p className="text-xs text-brand-text-muted">
            Every device of the list, upright and sideways, for this screen and
            language.
          </p>
        </div>
        {run.status === "running" ? (
          <button
            type="button"
            onClick={() => controller.current?.abort()}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-card-border px-3 text-xs font-bold text-brand-text transition hover:bg-card-hover active:scale-95"
          >
            <Square className="size-3.5" aria-hidden />
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            className="min-h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
          >
            {run.status === "idle" ? "Check all sizes" : "Check again"}
          </button>
        )}
      </div>

      {run.status === "running" && (
        <div role="status" className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-text-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {run.done} / {run.total} sizes
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-card-border">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
              style={{ width: `${(run.done / run.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {(run.status === "finished" || run.status === "cancelled") && (
        <div className="space-y-3">
          <p
            role="status"
            className="flex items-center gap-2 text-xs font-semibold text-brand-text"
          >
            {broken.length === 0 && run.status === "finished" && (
              <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
            )}
            {run.status === "cancelled" ? "Cancelled after " : ""}
            {run.results.length} size{run.results.length > 1 ? "s" : ""} checked
            {run.status === "cancelled" ? ` of ${run.total}` : ""} ·{" "}
            {broken.length === 0
              ? "no problem"
              : `${broken.length} with problems`}
          </p>
          {broken.map((result) => (
            <div
              key={result.key}
              className="space-y-1.5"
              aria-label={result.device.label}
            >
              <p className="text-xs font-bold text-brand-text">
                {result.device.label}
                <span className="font-medium text-brand-text-muted">
                  {" "}
                  · {result.orientation} · {result.size.width}×
                  {result.size.height}
                </span>
              </p>
              {result.error ? (
                <p className="text-xs text-brand-text-muted">
                  Not measured: {result.error}.
                </p>
              ) : (
                <ul
                  className="space-y-1.5"
                  onClickCapture={() =>
                    setViewport({
                      deviceId: result.device.id,
                      orientation: result.orientation,
                      ...result.size,
                    })
                  }
                >
                  {describeLayoutIssues(result.issues, result.size).map(
                    (warning) => (
                      <li key={warning.id}>
                        <IssueRow
                          level="warning"
                          message={warning.message}
                          path={warning.path}
                        />
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {probe.size && (
        <iframe
          ref={probe.frameRef}
          src={PREVIEW_SRC}
          title="Size check"
          aria-hidden
          tabIndex={-1}
          width={probe.size.width}
          height={probe.size.height}
          // On screen but transparent and behind the Studio: a frame moved off screen or
          // hidden is throttled by the browser, and would be measured mid-animation.
          className="pointer-events-none fixed left-0 top-0 -z-10 border-0 opacity-0"
        />
      )}
    </section>
  );
}
