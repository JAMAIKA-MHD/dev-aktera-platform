import { AlertTriangle, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useStudio } from "../StudioContext";

// The frame of every settings panel: a header saying what the panel changes, cards grouping
// related fields, and the design issues of the panel shown right where they are fixed.

export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start gap-3 px-5 pb-2 pt-5">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-black tracking-tight text-brand-text">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-brand-text-muted">{description}</p>
      </div>
      {actions}
    </header>
  );
}

export function PanelSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-card-border bg-card-bg p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-brand-text">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-brand-text-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function PanelBody({ children }: { children: ReactNode }) {
  return <div className="space-y-4 px-5 pb-8 pt-3">{children}</div>;
}

// The design issues whose path starts with one of `prefixes` (T1.11), errors first.
export function PanelIssues({ prefixes }: { prefixes: readonly string[] }) {
  const issues = useStudio((state) => state.issues);
  const mine = issues
    .filter((issue) =>
      prefixes.some(
        (prefix) =>
          issue.path === prefix || issue.path.startsWith(`${prefix}.`),
      ),
    )
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  if (mine.length === 0) return null;
  return (
    <ul className="space-y-2" aria-label="Issues in this section">
      {mine.map((issue) => {
        const error = issue.level === "error";
        const Icon = error ? CircleAlert : AlertTriangle;
        return (
          <li
            key={issue.id}
            className={`flex gap-2 rounded-xl px-3 py-2.5 text-xs font-medium leading-relaxed ${
              error
                ? "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200"
                : "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
            }`}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{issue.message}</span>
          </li>
        );
      })}
    </ul>
  );
}
