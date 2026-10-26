import React from "react";
import { REWARD_TYPE_NAME_PLURAL } from "../../lib/rewardTypes";
import type { RewardTypeFilterValue } from "./rewardCardTheme";

interface RewardTypeFilterProps {
  value: RewardTypeFilterValue;
  onChange: (value: RewardTypeFilterValue) => void;
  counts: { all: number; voucher: number; physical: number };
}

const OPTIONS: { id: RewardTypeFilterValue; label: string }[] = [
  { id: "all", label: "All" },
  { id: "voucher", label: REWARD_TYPE_NAME_PLURAL.voucher },
  { id: "physical", label: REWARD_TYPE_NAME_PLURAL.physical },
];

// Shows every reward by default; the brand can narrow the list to one type.
export const RewardTypeFilter: React.FC<RewardTypeFilterProps> = ({
  value,
  onChange,
  counts,
}) => (
  <div
    role="group"
    aria-label="Filter by reward type"
    className="inline-flex rounded-2xl border border-card-border bg-card-bg-subtle p-1"
  >
    {OPTIONS.map((option) => {
      const active = value === option.id;
      return (
        <button
          key={option.id}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(option.id)}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
            active
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-brand-textMuted hover:text-brand-text"
          }`}
        >
          {option.label}
          <span
            className={`rounded-full px-1.5 text-[10px] font-black ${
              active ? "bg-white/20" : "bg-card-border/60"
            }`}
          >
            {counts[option.id]}
          </span>
        </button>
      );
    })}
  </div>
);
