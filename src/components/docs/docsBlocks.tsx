// The building blocks every documentation page is written with, so all pages share one look:
// headings, paragraphs, numbered steps, callouts, tables, code samples and definition lists.
import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Info,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

export function H({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-8 mb-3 text-base font-black tracking-tight text-brand-text first:mt-0">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="my-3 text-[13.5px] leading-relaxed text-brand-text/85">
      {children}
    </p>
  );
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="my-3 space-y-1.5 pl-1 text-[13.5px] leading-relaxed text-brand-text/85">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5">
          <span
            className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-blue-500/70"
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Numbered steps, each with a title, what to do, and (optionally) what you should see. */
export function Steps({
  steps,
}: {
  steps: { title: string; body: ReactNode; result?: ReactNode }[];
}) {
  return (
    <ol className="my-4 space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[13.5px] font-bold text-brand-text">
              {step.title}
            </p>
            <div className="mt-1 text-[13.5px] leading-relaxed text-brand-text/85">
              {step.body}
            </div>
            {step.result && (
              <p className="mt-2 flex gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  <strong>Expected result:</strong> {step.result}
                </span>
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

const CALLOUTS = {
  note: {
    icon: Info,
    label: "Note",
    className:
      "border-blue-500/25 bg-blue-500/8 text-blue-800 dark:text-blue-200",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    className:
      "border-emerald-500/25 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200",
  },
  warning: {
    icon: AlertTriangle,
    label: "Important",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  security: {
    icon: ShieldCheck,
    label: "Security",
    className:
      "border-violet-500/25 bg-violet-500/8 text-violet-800 dark:text-violet-200",
  },
} as const;

export function Callout({
  kind = "note",
  children,
}: {
  kind?: keyof typeof CALLOUTS;
  children: ReactNode;
}) {
  const { icon: Icon, label, className } = CALLOUTS[kind];
  return (
    <div
      className={`my-4 flex gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed ${className}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <strong className="font-bold">{label}. </strong>
        {children}
      </div>
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-card-border">
      <table className="w-full min-w-[420px] border-collapse text-left text-[12.5px]">
        <thead className="bg-card-bg-subtle">
          <tr>
            {head.map((cell) => (
              <th
                key={cell}
                scope="col"
                className="border-b border-card-border px-3 py-2 font-bold text-brand-text"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-b border-card-border/60 last:border-0"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-3 py-2 align-top text-brand-text/85 ${
                    cellIndex === 0 ? "font-semibold text-brand-text" : ""
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A copy-pasteable sample. */
export function Code({
  children,
  label,
}: {
  children: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(children).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => undefined,
    );
  };
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-700/60 px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label ?? "Example"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-slate-300 hover:bg-white/10"
        >
          {copied ? (
            <Check className="size-3" aria-hidden />
          ) : (
            <Copy className="size-3" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/** Inline code / UI value. */
export function K({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-md border border-card-border bg-card-bg-subtle px-1.5 py-0.5 font-mono text-[12px] text-brand-text">
      {children}
    </code>
  );
}

/** A UI element name, as the user sees it on screen. */
export function UI({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-brand-text">{children}</strong>;
}

export function Terms({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="my-4 divide-y divide-card-border/70 rounded-xl border border-card-border">
      {items.map(([term, definition]) => (
        <div
          key={term}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4"
        >
          <dt className="text-[13px] font-bold text-brand-text">{term}</dt>
          <dd className="text-[13px] leading-relaxed text-brand-text/85">
            {definition}
          </dd>
        </div>
      ))}
    </dl>
  );
}
