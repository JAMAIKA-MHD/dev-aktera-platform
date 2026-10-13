import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DIGITAL_ITEM,
  PHYSICAL_ITEM,
  REWARD_TYPE_NAME,
  REWARD_TYPE_NAME_PLURAL,
  rewardTypeName,
} from "./rewardTypes";

describe("reward type names", () => {
  it("calls a virtual reward a Digital Item and a physical one a Physical Item", () => {
    expect(DIGITAL_ITEM).toBe("Digital Item");
    expect(PHYSICAL_ITEM).toBe("Physical Item");
    expect(REWARD_TYPE_NAME).toEqual({
      voucher: "Digital Item",
      physical: "Physical Item",
    });
    expect(REWARD_TYPE_NAME_PLURAL).toEqual({
      voucher: "Digital Items",
      physical: "Physical Items",
    });
  });

  it("names a type from its stored value", () => {
    expect(rewardTypeName("voucher")).toBe("Digital Item");
    expect(rewardTypeName("physical")).toBe("Physical Item");
    expect(rewardTypeName(undefined)).toBe("Digital Item");
    expect(rewardTypeName("anything else")).toBe("Digital Item");
  });
});

// ---- The convention holds where the brand reads it --------------------------------------------

// The screens of the Reward Library and what they use: no other name for the two types.
const SCREENS = [
  "src/components/PrizesManager.tsx",
  "src/components/rewards",
  "src/dashboard/pages",
  "src/services/inventoryService.ts",
  "src/services/deliveryService.ts",
  "src/lib/codeExport.ts",
  "src/lib/codeExpiry.ts",
  "src/lib/expiryPolicy.ts",
];

// Screens that talk about rewards in passing (a campaign, a test, the notifications): they must
// not call a reward a "voucher" either.
const OTHER_SCREENS = [
  "src/components/CampaignWorkspace.tsx",
  "src/components/CampaignWizard.tsx",
  "src/components/CampaignTestModal.tsx",
  "src/components/AccountSettings.tsx",
];

const root = process.cwd();

function sources(path: string): string[] {
  const full = join(root, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((entry) => {
    const child = join(path, entry);
    if (statSync(join(root, child)).isDirectory()) return sources(child);
    return /\.(tsx|ts)$/.test(entry) && !/\.test\./.test(entry)
      ? [join(root, child)]
      : [];
  });
}

const withoutComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// Text that can be shown to people: a string literal, or a JSX text (which may run over lines).
const visibleStrings = (code: string) =>
  (withoutComments(code).match(/"[^"\n]*"|`[^`\n]*`|>[^<>{}]+</g) ?? []).filter(
    (text) => /[A-Za-z]{3}/.test(text),
  );

const OTHER_NAMES = /\b(physical|digital|virtual|vouchers?|merch)\b/i;

// A text may use the two names. The stored values (`voucher`, `physical`) are not shown to
// anyone, and a module path is not text either.
const breaksConvention = (text: string) => {
  const inner = text.replace(/^["`>]|["`<]$/g, "").trim();
  if (/^(voucher|physical)$/.test(inner)) return false;
  if (/^\.{1,2}\//.test(inner) || /^src\//.test(inner)) return false;
  const withoutAllowed = inner.replace(/\b(Physical|Digital) Items?\b/g, "");
  return OTHER_NAMES.test(withoutAllowed);
};

const place = (file: string) => file.split(/[\\/]src[\\/]/)[1];

describe("the convention in the screens", () => {
  it("uses Digital Item and Physical Item, and no other name for the two types", () => {
    const offenders: string[] = [];
    for (const path of SCREENS) {
      for (const file of sources(path)) {
        for (const text of visibleStrings(readFileSync(file, "utf8"))) {
          if (breaksConvention(text)) {
            offenders.push(
              `${place(file)}: ${text.replace(/\s+/g, " ").trim()}`,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never calls a reward a voucher in the other screens", () => {
    const offenders: string[] = [];
    for (const path of OTHER_SCREENS) {
      for (const file of sources(path)) {
        for (const text of visibleStrings(readFileSync(file, "utf8"))) {
          // The stored value of a type ("voucher") is not text shown to anyone.
          if (/\bvouchers?\b/i.test(text) && text.trim() !== '"voucher"') {
            offenders.push(
              `${place(file)}: ${text.replace(/\s+/g, " ").trim()}`,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never shows the stored value of a type (voucher, physical) on a screen", () => {
    const offenders: string[] = [];
    for (const path of ["src/components", "src/dashboard"]) {
      for (const file of sources(path)) {
        const code = withoutComments(readFileSync(file, "utf8"));
        // {prize.category}, {reward.category}, {template.category} ...
        for (const match of code.match(/\{\s*[\w.?]*\.category\s*\}/g) ?? []) {
          offenders.push(`${place(file)}: ${match}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("knows what breaks it", () => {
    for (const bad of [
      '"Digital code"',
      '"Physical reward"',
      '"Digital Voucher / Code"',
      '"Physical Item / Merch"',
      ">Voucher<",
      '"Gift cards and vouchers"',
      '"Digital codes"',
      '"Physical"',
      ">\n    Digital Voucher / Code\n   <",
    ]) {
      expect(breaksConvention(bad), bad).toBe(true);
    }
    for (const good of [
      '"Digital Item"',
      '"Physical Items"',
      ">Physical Item<",
      '"voucher"',
      '"physical"',
      '"./PhysicalDeliveryPanel"',
      '"Winners and delivery"',
    ]) {
      expect(breaksConvention(good), good).toBe(false);
    }
  });
});
