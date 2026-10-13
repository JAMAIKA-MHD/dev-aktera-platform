import { describe, expect, it } from "vitest";
import {
  buildCodeExportRows,
  buildDeliveryExportRows,
  codeExportStatus,
} from "./codeExport";
import type { PhysicalWinner } from "../types";

const NOW = new Date("2026-10-13T12:00:00Z");

const items = [
  { item_index: 1, item_value: "AAA", expires_at: "2099-12-31T22:59:59.000Z" },
  { item_index: 2, item_value: "BBB", expires_at: "2020-01-01T22:59:59.000Z" },
  { item_index: 3, item_value: "CCC" },
  {
    item_index: 4,
    item_value: "DDD",
    is_used: true,
    redeemed_at: "2026-10-10T09:30:00Z",
  },
  { item_index: 5, item_value: null },
];

describe("buildCodeExportRows", () => {
  it("adds the expiry date and a status that says used / expired / available", () => {
    expect(
      buildCodeExportRows(items, { category: "voucher", now: NOW }),
    ).toEqual([
      {
        Index: 1,
        Code: "AAA",
        Status: "Available",
        Expires: "2099-12-31",
        "Used on": "",
      },
      {
        Index: 2,
        Code: "BBB",
        Status: "Expired",
        Expires: "2020-01-01",
        "Used on": "",
      },
      {
        Index: 3,
        Code: "CCC",
        Status: "Available",
        Expires: "",
        "Used on": "",
      },
      {
        Index: 4,
        Code: "DDD",
        Status: "Used",
        Expires: "",
        "Used on": "2026-10-10",
      },
      { Index: 5, Code: "", Status: "Empty", Expires: "", "Used on": "" },
    ]);
  });

  it("gives the codes without a date of their own the date of their reward", () => {
    const rows = buildCodeExportRows(items, {
      category: "voucher",
      inheritedExpiresAt: "2026-01-01T22:59:59.000Z",
      now: NOW,
    });
    // CCC inherits a date in the past: expired. AAA keeps its own later date.
    expect(rows[2]).toMatchObject({ Status: "Expired", Expires: "2026-01-01" });
    expect(rows[0]).toMatchObject({
      Status: "Available",
      Expires: "2099-12-31",
    });
    // A used code stays used, whatever its date.
    expect(rows[3].Status).toBe("Used");
  });

  it("has no expiry column for a physical reward", () => {
    const rows = buildCodeExportRows(items, { category: "physical", now: NOW });
    expect(Object.keys(rows[0])).toEqual([
      "Index",
      "Code",
      "Status",
      "Used on",
    ]);
  });

  it("can be imported back: the code and index columns are still found, no other column looks like one", () => {
    const keys = Object.keys(
      buildCodeExportRows(items, { category: "voucher", now: NOW })[0],
    );
    expect(keys.slice(0, 2)).toEqual(["Index", "Code"]);
    for (const extra of keys.slice(2)) {
      expect(extra.toLowerCase()).not.toMatch(/code|value|voucher|index/);
    }
  });
});

describe("codeExportStatus", () => {
  it("treats a code redeemed by a player as used", () => {
    expect(
      codeExportStatus(
        { item_index: 1, item_value: "A", is_redeemed: true },
        null,
        NOW,
      ),
    ).toBe("Used");
  });
});

const winner = (over: Partial<PhysicalWinner> = {}): PhysicalWinner => ({
  entryId: "e1",
  phoneNumber: "0551234567",
  participantName: "Ali",
  prizeName: "Branded cap",
  wonAt: "2026-10-12T10:00:00Z",
  deliveryStatus: "not_delivered",
  deliveredAt: null,
  ...over,
});

describe("buildDeliveryExportRows", () => {
  it("lists each winner with whether the reward was delivered, and when", () => {
    expect(
      buildDeliveryExportRows([
        winner(),
        winner({
          entryId: "e2",
          participantName: "Sara",
          deliveryStatus: "delivered",
          deliveredAt: "2026-10-14T08:00:00Z",
        }),
      ]),
    ).toEqual([
      {
        Winner: "Ali",
        Phone: "0551234567",
        Reward: "Branded cap",
        "Won on": "2026-10-12",
        Delivery: "Not delivered",
        "Delivered on": "",
      },
      {
        Winner: "Sara",
        Phone: "0551234567",
        Reward: "Branded cap",
        "Won on": "2026-10-12",
        Delivery: "Delivered",
        "Delivered on": "2026-10-14",
      },
    ]);
  });

  it("defuses what a spreadsheet would run as a formula", () => {
    const [row] = buildDeliveryExportRows([
      winner({
        participantName: '=HYPERLINK("http://evil")',
        phoneNumber: "+213551234567",
      }),
    ]);
    expect(row.Winner).toBe('\'=HYPERLINK("http://evil")');
    expect(row.Phone).toBe("'+213551234567");
  });

  it("leaves a winner with no name or phone empty", () => {
    const [row] = buildDeliveryExportRows([
      winner({ participantName: null, phoneNumber: null }),
    ]);
    expect(row.Winner).toBe("");
    expect(row.Phone).toBe("");
  });

  it("writes the validity period for a code not given yet, and its deadline once given", () => {
    const rows = buildCodeExportRows(
      [
        { item_index: 1, item_value: "AAA" },
        {
          item_index: 2,
          item_value: "BBB",
          is_used: true,
          redemption_expires_at: "2026-11-12T22:59:59.000Z",
        },
        {
          item_index: 3,
          item_value: "CCC",
          expires_at: "2099-01-01T22:59:59.000Z",
        },
        { item_index: 4, item_value: "DDD", is_used: true },
        { item_index: 5, item_value: null },
      ],
      { category: "voucher", expiryDays: 30, now: NOW },
    );
    expect(rows.map((r) => r.Expires)).toEqual([
      "1 month after delivery",
      "2026-11-12",
      "2099-01-01",
      "",
      "",
    ]);
  });
});
