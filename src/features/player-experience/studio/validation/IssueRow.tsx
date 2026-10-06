import { AlertTriangle, ArrowRight, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { DesignIssue } from "../../domain/validation";
import { PANEL_META } from "../layout/StudioNav";
import { panelForPath } from "../panelForPath";
import { useStudio } from "../StudioContext";

// One issue of the validation panel, and a titled group of them (T6.8, T6.10). The row names
// the panel where the issue is fixed; a click opens it, on the field.

export function IssueRow({
  level,
  message,
  path,
  context,
}: {
  level: DesignIssue["level"];
  message: string;
  path: string | null;
  context?: ReactNode; // e.g. the screen size of a layout issue (T6.10)
}) {
  const setPanel = useStudio((state) => state.setPanel);
  const panel = path ? panelForPath(path) : null;
  const error = level === "error";
  const Icon = error ? CircleAlert : AlertTriangle;
  const body = (
    <>
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${error ? "text-red-500" : "text-amber-500"}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span
          className={`mr-1.5 text-[10px] font-black uppercase tracking-wider ${error ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}
        >
          {error ? "Error" : "Warning"}
        </span>
        {context}
        <span className="block text-sm text-brand-text">{message}</span>
      </span>
      {panel && (
        <span className="flex shrink-0 items-center gap-1 self-center text-xs font-bold text-blue-600 dark:text-blue-400">
          {PANEL_META[panel].label}
          <ArrowRight
            className="size-3.5 transition group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      )}
    </>
  );
  const className =
    "group flex w-full gap-2.5 rounded-xl border border-card-border bg-card-bg px-3 py-2.5 text-left shadow-sm";
  if (!panel || !path) return <div className={className}>{body}</div>;
  return (
    <button
      type="button"
      onClick={() => setPanel(panel, path)}
      className={`${className} transition hover:border-blue-300 hover:shadow-md active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:border-blue-500/50`}
    >
      {body}
    </button>
  );
}

export function IssueGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="space-y-2" aria-label={title}>
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-brand-text-muted">
        {title}
        <span className="rounded-full bg-card-bg px-1.5 tabular-nums ring-1 ring-card-border">
          {count}
        </span>
      </h3>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}
