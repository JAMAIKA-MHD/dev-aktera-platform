import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { UI_STATUS_STYLES } from './theme';
import type { UiStatusTone } from './types';

const METRIC_TONE_STYLES: Record<
  'indigo' | 'emerald' | 'amber' | 'rose' | 'slate',
  { icon: string; accent: string }
> = {
  indigo: {
    icon: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    accent: 'from-indigo-500/15 to-violet-500/10',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    accent: 'from-emerald-500/15 to-teal-500/10',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600 border-amber-100',
    accent: 'from-amber-500/20 to-orange-500/10',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-600 border-rose-100',
    accent: 'from-rose-500/15 to-pink-500/10',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-600 border-slate-200',
    accent: 'from-slate-500/10 to-slate-400/5',
  },
};

interface Phase2PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function Phase2PageHeader({
  eyebrow,
  title,
  description,
  action,
}: Phase2PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  );
}

interface Phase2MetricCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone?: keyof typeof METRIC_TONE_STYLES;
}

export function Phase2MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'indigo',
}: Phase2MetricCardProps) {
  const styles = METRIC_TONE_STYLES[tone];

  return (
    <div className="dashboard-card relative overflow-hidden rounded-[28px] p-5">
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${styles.accent}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {label}
          </p>
          <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

interface Phase2SectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}

export function Phase2SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
}: Phase2SectionCardProps) {
  return (
    <section className="dashboard-card rounded-[28px]">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function Phase2StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: UiStatusTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${UI_STATUS_STYLES[tone]}`}
    >
      {label}
    </span>
  );
}

export function Phase2InlineNotice({
  tone,
  title,
  children,
}: {
  tone: 'success' | 'danger' | 'info' | 'warning';
  title?: string;
  children: ReactNode;
}) {
  const styles: Record<typeof tone, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles[tone]}`}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  );
}

export function Phase2EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
