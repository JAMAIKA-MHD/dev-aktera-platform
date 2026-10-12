import React, { useState } from "react";
import { PrizesManager } from "../PrizesManager";
import { PartnerLibraryComingSoon } from "./PartnerLibraryComingSoon";

type Library = "local" | "partner";

const TABS: { id: Library; label: string }[] = [
  { id: "local", label: "Local Library" },
  { id: "partner", label: "Partner Library" },
];

// The Reward Library page: the brand's own rewards (everything PrizesManager already does) and,
// next to it, the partners' library, which is "Coming soon" in the MVP.
export const RewardLibrary: React.FC<
  React.ComponentProps<typeof PrizesManager>
> = (props) => {
  const [library, setLibrary] = useState<Library>("local");

  return (
    <div className="space-y-6 max-w-[1800px] mx-auto">
      <div
        role="tablist"
        aria-label="Reward libraries"
        className="inline-flex rounded-2xl border border-card-border bg-card-bg-subtle p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`reward-tab-${tab.id}`}
            aria-selected={library === tab.id}
            aria-controls={`reward-panel-${tab.id}`}
            onClick={() => setLibrary(tab.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              library === tab.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-brand-textMuted hover:text-brand-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`reward-panel-${library}`}
        aria-labelledby={`reward-tab-${library}`}
      >
        {library === "local" ? (
          <PrizesManager {...props} />
        ) : (
          <PartnerLibraryComingSoon />
        )}
      </div>
    </div>
  );
};
