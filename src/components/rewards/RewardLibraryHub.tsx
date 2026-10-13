import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  Globe,
  Library,
  Mail,
  Package,
  Phone,
  Plus,
  Ticket,
  Trash2,
} from "lucide-react";
import { PATHS } from "../../dashboard/paths";
import { useRewardPartners } from "../../hooks/useRewardPartners";
import { REWARD_TYPE_NAME_PLURAL } from "../../lib/rewardTypes";
import type { PrizeTemplate, RewardPartner } from "../../types";
import { AddPartnerDialog } from "./AddPartnerDialog";

// The entry of the Reward Library: where the rewards come from. "Local" is the brand's own
// library (digital codes and physical rewards, managed in the next screen); the partner
// libraries are announced and not wired in the MVP: nothing is fetched, nothing is clickable.
const PARTNERS = [
  {
    name: "Gifty",
    description: "Gift cards and coupons from partner brands.",
    tone: "bg-pink-500/15 text-pink-500 border-pink-500/30",
  },
  {
    name: "Yassir",
    description: "Ride and delivery credits from the Yassir SuperApp.",
    tone: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  },
  {
    name: "Chargily",
    description: "Online payments and mobile top-ups.",
    tone: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  },
] as const;

interface RewardLibraryHubProps {
  prizes: PrizeTemplate[];
  organizationId?: string | null;
  /** False for a read-only viewer: the list stays visible, nothing can be added or removed. */
  canManage?: boolean;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// A partner the brand registered itself. It is not connected to anything yet.
const OwnPartnerCard: React.FC<{
  partner: RewardPartner;
  canManage: boolean;
  onRemove: (partner: RewardPartner) => Promise<void>;
}> = ({ partner, canManage, onRemove }) => {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setRemoving(true);
    setError(null);
    try {
      await onRemove(partner);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not remove this partner.",
      );
      setRemoving(false);
      setConfirming(false);
    }
  };

  return (
    <li
      aria-label={`${partner.name}: your partner`}
      className="min-w-0 rounded-3xl border border-card-border bg-card-bg p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-500/30 bg-slate-500/15 text-lg font-black uppercase text-slate-500"
          >
            {partner.name[0]}
          </div>
          <h4
            title={partner.name}
            className="line-clamp-2 min-w-0 text-base font-black [overflow-wrap:anywhere]"
          >
            {partner.name}
          </h4>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
          Not connected yet
        </span>
      </div>

      {partner.description && (
        <p className="mt-3 line-clamp-3 text-xs text-brand-textMuted [overflow-wrap:anywhere]">
          {partner.description}
        </p>
      )}

      <ul className="mt-3 space-y-1.5 text-xs text-brand-textMuted">
        {partner.websiteUrl && (
          <li className="flex min-w-0 items-center gap-2">
            <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <a
              href={partner.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-bold text-emerald-500 hover:underline"
            >
              {hostOf(partner.websiteUrl)}
            </a>
          </li>
        )}
        {(partner.contactName || partner.contactPhone) && (
          <li className="flex min-w-0 items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {[partner.contactName, partner.contactPhone]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </li>
        )}
        {partner.contactEmail && (
          <li className="flex min-w-0 items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <a
              href={`mailto:${partner.contactEmail}`}
              className="truncate hover:underline"
            >
              {partner.contactEmail}
            </a>
          </li>
        )}
      </ul>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-500">
          {error}
        </p>
      )}

      {canManage && (
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-card-border pt-3">
          {confirming ? (
            <>
              <span className="mr-auto text-xs font-bold">
                Remove this partner?
              </span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={removing}
                className="rounded-lg px-3 py-1 text-xs font-bold text-brand-textMuted hover:text-brand-text"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={removing}
                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-black text-white hover:bg-red-700 disabled:opacity-60"
              >
                {removing ? "Removing..." : "Remove"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Remove ${partner.name}`}
              className="rounded-lg p-1.5 text-brand-textMuted transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </li>
  );
};

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
  organizationId = null,
  canManage = false,
}) => {
  const {
    partners,
    loading: partnersLoading,
    error: partnersError,
    reload,
    add,
    remove,
  } = useRewardPartners(organizationId);
  const [adding, setAdding] = useState(false);

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
                  Your own Digital Items and Physical Items: upload codes, set
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
              label={REWARD_TYPE_NAME_PLURAL.voucher}
              value={digital}
              icon={<Ticket className="h-3 w-3" aria-hidden="true" />}
            />
            <Stat
              label={REWARD_TYPE_NAME_PLURAL.physical}
              value={physical}
              icon={<Package className="h-3 w-3" aria-hidden="true" />}
            />
            <Stat label="In stock" value={available} />
          </dl>
        </Link>
      </section>

      <section aria-labelledby="partner-libraries-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3
              id="partner-libraries-title"
              className="text-xs font-black uppercase tracking-widest text-brand-textMuted"
            >
              Partner libraries
            </h3>
            <p className="mt-1 text-xs text-brand-textMuted">
              Offer partner rewards without managing any stock. The connections
              arrive in a later version; you can already register the partners
              you work with.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              Add a partner
            </button>
          )}
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

        {partnersError && (
          <p role="alert" className="text-xs text-red-500">
            {partnersError}{" "}
            <button
              type="button"
              onClick={() => void reload()}
              className="font-bold underline"
            >
              Retry
            </button>
          </p>
        )}

        {(partners.length > 0 || partnersLoading) && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-brand-textMuted">
              Your partners
            </h4>
            {partnersLoading ? (
              <p className="text-xs text-brand-textMuted">
                Loading your partners...
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {partners.map((partner) => (
                  <OwnPartnerCard
                    key={partner.id}
                    partner={partner}
                    canManage={canManage}
                    onRemove={(p) => remove(p.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {adding && (
        <AddPartnerDialog onClose={() => setAdding(false)} onSubmit={add} />
      )}
    </div>
  );
};
