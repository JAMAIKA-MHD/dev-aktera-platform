import React from "react";
import { Clock } from "lucide-react";

// Partner rewards (a partner's own catalogue, delivered by the partner) are not part of the
// MVP: nothing is wired, nothing is fetched. This only shows the brand what is coming.
const PARTNERS = [
  {
    name: "Chargily",
    description: "Digital payment and top-up rewards.",
  },
  {
    name: "Gifty",
    description: "Gift cards and vouchers from partner brands.",
  },
] as const;

export const PartnerLibraryComingSoon: React.FC = () => (
  <section aria-labelledby="partner-library-title" className="space-y-4">
    <div>
      <h3
        id="partner-library-title"
        className="text-lg font-black text-brand-text"
      >
        Partner Library
      </h3>
      <p className="text-sm text-brand-textMuted mt-1">
        Offer rewards from our partners without managing any stock yourself.
        This arrives in a later version; your Local Library keeps working as
        usual.
      </p>
    </div>

    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PARTNERS.map((partner) => (
        <li
          key={partner.name}
          className="rounded-2xl border border-dashed border-card-border bg-card-bg p-5 opacity-80"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-base font-black text-brand-text">
              {partner.name}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-500">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Coming soon
            </span>
          </div>
          <p className="mt-2 text-xs text-brand-textMuted">
            {partner.description}
          </p>
        </li>
      ))}
    </ul>
  </section>
);
