import { Battery, Signal, Wifi } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toAlphaColor } from './theme';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function Phase2PlayerFrame({
  children,
  accentColor = '#7C3AED',
}: {
  children: ReactNode;
  accentColor?: string;
}) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      );
    };

    updateClock();
    const interval = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#07070F] px-0 py-0 sm:px-4 sm:py-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 blur-3xl"
        style={{
          background: `radial-gradient(circle at top, ${toAlphaColor(accentColor, 0.24)} 0%, transparent 70%)`,
        }}
      />
      <div className="relative mx-auto flex w-full max-w-[500px] items-center justify-center p-0 md:p-6 lg:p-8 xl:p-10">
        <div className="relative flex h-screen max-h-[100vh] w-full flex-col overflow-hidden rounded-[48px] border-4 border-[#2D2D3F]/70 bg-[#09090F] shadow-[0_0_80px_rgba(124,58,237,0.15)] transition-all duration-500 ease-out md:h-[880px] md:max-h-[92vh] md:border-[12px] md:border-[#1E1E2E]">
          <div className="pointer-events-none absolute inset-0 z-40 rounded-[48px] bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.04]" />
          <div className="pointer-events-none absolute inset-0 z-30 rounded-[48px] border border-violet-500/10" />

          <div className="absolute left-1/2 top-0 z-50 flex h-[30px] w-32 -translate-x-1/2 items-center justify-center gap-1.5 rounded-b-2xl bg-black px-3">
            <div className="flex h-3 w-3 items-center justify-center rounded-full border border-zinc-800 bg-[#111]">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-950/80" />
            </div>
            <div className="h-1 w-8 rounded-full bg-[#111]" />
          </div>

          <div className="relative z-40 flex h-10 items-center justify-between border-b border-white/[0.02] bg-[#0F0F1A] px-6 pt-2 text-[11px] font-semibold text-zinc-400 select-none">
            <span className="font-medium font-sans text-xs tracking-wide">{time || '13:16'}</span>
            <div className="flex items-center gap-2">
              <Signal className="h-3.5 w-3.5 stroke-[2.5]" />
              <Wifi className="h-3.5 w-3.5 stroke-[2.5]" />
              <div className="flex items-center gap-0.5">
                <span className="mr-0.5 text-[9px] text-zinc-500">4G</span>
                <Battery className="h-4 w-4 stroke-[2]" />
              </div>
            </div>
          </div>

          <div className="relative z-20 flex flex-1 flex-col overflow-hidden bg-[#0F0F1A] text-zinc-100">
            {children}
          </div>

          <div className="relative z-40 flex justify-center bg-[#0F0F1A] pb-1.5 pt-0.5">
            <div className="h-1 w-32 rounded-full bg-zinc-600 opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Phase2PlayerCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={joinClasses(
        'player-surface rounded-[28px] bg-[linear-gradient(180deg,rgba(31,31,46,0.98),rgba(22,22,37,0.98))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Phase2PlayerNotice({
  title,
  description,
  tone = 'default',
}: {
  title: string;
  description: ReactNode;
  tone?: 'default' | 'danger' | 'success' | 'warning';
}) {
  const toneClasses: Record<typeof tone, string> = {
    default: 'border-white/10 bg-white/5 text-zinc-300',
    danger: 'border-rose-500/25 bg-rose-500/10 text-rose-200',
    success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
    warning: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
  };

  return (
    <div className={joinClasses('rounded-2xl border px-4 py-3 text-sm', toneClasses[tone])}>
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-sm/6">{description}</div>
    </div>
  );
}
