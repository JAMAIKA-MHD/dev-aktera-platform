import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Library, Package, Ticket } from "lucide-react";
import { PATHS } from "../../dashboard/paths";
import type { PrizeTemplate } from "../../types";

// The entry of the Reward Library: where the rewards come from. "Local" is the brand's own
// library (digital codes and physical rewards, managed in the next screen); the partner
// libraries are announced and not wired in the MVP: nothing is fetched, nothing is clickable.
const PARTNERS = [
  {
    name: "Gifty",
    description: "Gift cards and vouchers from partner brands.",
    tone: "bg-pink-500/15 text-pink-500 border-pink-500/30",
  },
  {
    name: "Yassir",
    description: "Ride and delivery credits from the Yassir SuperApp.",
    tone: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  },
  {
    name: "Chargily",
    description: "Digital payments and mobile top-ups.",
    tone: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  },
] as const;

interface RewardLibraryHubProps {
  prizes: PrizeTemplate[];
}

const Stat: React.FC<{
  label: string;
  value: number;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-card-border bg-card-bg-subtle px-4 py-3">
    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-textMuted">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-2xl font-black text-brand-text">
      {value.toLocaleString()}
    </div>
  </div>
);

export const RewardLibraryHub: React.FC<RewardLibraryHubProps> = ({
  prizes,
}) => {
  const digital = prizes.filter((p) => p.category === "voucher").length;
  const physical = prizes.filter((p) => p.category === "physical").length;
  const available = prizes.reduce((sum, p) => sum + p.availableStock, 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 pb-16 text-brand-text">
      <header>
        <h2 className="text-3xl font-black tracking-tight">Reward Library</h2>
        <p className="mt-1 text-sm font-medium text-brand-textMuted">
          Choose where your rewards come from.
        </p>
      </header>

      <section aria-labelledby="your-library-title" className="space-y-4">
        <h3
          id="your-library-title"
          className="text-xs font-black uppercase tracking-widest text-brand-textMuted"
        >
          Your library
        </h3>

        <Link
          to={PATHS.prizesLocal}
          aria-label="Local Library: open your own rewards"
          className="group relative block overflow-hidden rounded-3xl border border-card-border bg-card-bg p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:p-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl transition-opacity group-hover:opacity-100"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
                <Library className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xl font-black sm:text-2xl">
                    Local Library
                  </h4>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-500">
                    Available
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-sm text-brand-textMuted">
                  Your own digital codes and physical rewards: upload codes, set
                  expiry dates, follow the stock and the delivery of what you
                  give away.
                </p>
              </div>
            </div>

            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition-all group-hover:bg-emerald-700 lg:self-center">
              Open Local Library
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </div>

          <dl className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Rewards" value={prizes.length} />
            <Stat
              label="Digital codes"
              value={digital}
              icon={<Ticket className="h-3 w-3" aria-hidden="true" />}
            />
            <Stat
              label="Physical"
              value={physical}
              icon={<Package className="h-3 w-3" aria-hidden="true" />}
            />
            <Stat label="In stock" value={available} />
          </dl>
        </Link>
      </section>

      <section aria-labelledby="partner-libraries-title" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="partner-libraries-title"
            className="text-xs font-black uppercase tracking-widest text-brand-textMuted"
          >
            Partner libraries
          </h3>
          <p className="text-xs text-brand-textMuted">
            Offer partner rewards without managing any stock. Arriving in a
            later version.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PARTNERS.map((partner) => (
            <li
              key={partner.name}
              aria-label={`${partner.name}: coming soon`}
              className="min-w-0 rounded-3xl border border-dashed border-card-border bg-card-bg p-5 opacity-85"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    aria-hidden="true"
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg font-black ${partner.tone}`}
                  >
                    {partner.name[0]}
                  </div>
                  <h4 className="truncate text-base font-black">
                    {partner.name}
                  </h4>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-500">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Coming soon
                </span>
              </div>
              <p className="mt-3 text-xs text-brand-textMuted">
                {partner.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
