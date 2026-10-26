// How the two kinds of reward are called, everywhere the brand reads it (naming convention of the
// product): a reward made of codes is a **Digital Item**, a reward handed over by the brand is a
// **Physical Item**. The stored values stay `voucher` and `physical` (database, API); only the
// names shown to people come from here, so one change renames them everywhere.
import type { PrizeTemplate } from "../types";

export type RewardType = PrizeTemplate["category"];

export const DIGITAL_ITEM = "Digital Item";
export const PHYSICAL_ITEM = "Physical Item";

export const REWARD_TYPE_NAME: Record<RewardType, string> = {
  voucher: DIGITAL_ITEM,
  physical: PHYSICAL_ITEM,
};

export const REWARD_TYPE_NAME_PLURAL: Record<RewardType, string> = {
  voucher: `${DIGITAL_ITEM}s`,
  physical: `${PHYSICAL_ITEM}s`,
};

/** The name of a type from its stored value; anything unknown reads as a Digital Item. */
export function rewardTypeName(category: string | null | undefined): string {
  return category === "physical" ? PHYSICAL_ITEM : DIGITAL_ITEM;
}
