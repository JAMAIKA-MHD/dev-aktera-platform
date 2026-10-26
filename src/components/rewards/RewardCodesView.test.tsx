import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrizeTemplate } from "../../types";

// The page of a reward's codes. The data hook is replaced by a small stand-in that keeps the
// codes in React state (so typing, saving and clearing behave as on the page); the hook itself
// is covered on its own.
type Item = Record<string, unknown>;
const state = vi.hoisted(() => ({
  items: [] as Item[],
  loading: false,
  counts: { available: 1, used: 1, expired: 1 },
  fn: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock("../../hooks/useInventoryManager", async () => {
  const React = await import("react");
  const fn = {
    loadTemplateItems: vi.fn().mockResolvedValue([]),
    updateSingleItemValue: vi.fn().mockResolvedValue(true),
    updateItemExpiry: vi.fn().mockResolvedValue(true),
    setExpiryForAll: vi.fn().mockResolvedValue(2),
    clearUnresolvedConflicts: vi.fn(),
    validateImport: vi.fn(),
    resolveConflict: vi.fn(),
    executeImport: vi.fn().mockResolvedValue(true),
    generateRandomCodes: vi
      .fn()
      .mockReturnValue({ success: true, codes: ["GEN-0001"] }),
    fillEmptySlotsWithRandom: vi.fn().mockResolvedValue(true),
  };
  state.fn = fn;
  return {
    useInventoryManager: () => {
      const [templateItems, setTemplateItems] = React.useState(state.items);
      return {
        templateItems,
        setTemplateItems,
        loading: state.loading,
        saving: false,
        error: null,
        unresolvedConflicts: [],
        codeCounts: state.counts,
        ...fn,
      };
    },
  };
});

vi.mock("../../services/deliveryService", () => ({
  fetchPhysicalWinners: vi.fn().mockResolvedValue([
    {
      entryId: "e1",
      phoneNumber: "0551111111",
      participantName: "Ali",
      prizeName: "Phone case",
      wonAt: "2026-10-12T10:00:00Z",
      deliveryStatus: "not_delivered",
      deliveredAt: null,
    },
  ]),
  setDeliveryStatus: vi.fn().mockResolvedValue(undefined),
}));

const exporter = vi.hoisted(() => ({
  exportToCSV: vi.fn(),
  exportToExcel: vi.fn(),
  parseCSVFile: vi.fn(),
  parseExcelFile: vi.fn(),
}));
vi.mock("../../lib/exportUtils", () => exporter);

import { RewardCodesView } from "./RewardCodesView";

const voucher: PrizeTemplate = {
  id: "t1",
  name: "Ooredoo 500 DA",
  category: "voucher",
  description: "",
  totalStock: 3,
  availableStock: 3,
  allocatedStock: 0,
  itemValue: "500 DA",
};

const baseItems = (): Item[] => [
  {
    id: "i1",
    prize_template_id: "t1",
    item_index: 1,
    item_value: "AAA",
    source_type: "manual",
    expires_at: "2099-12-31T22:59:59.000Z",
    is_used: false,
  },
  {
    id: "i2",
    prize_template_id: "t1",
    item_index: 2,
    item_value: "BBB",
    source_type: "manual",
    expires_at: "2020-01-01T22:59:59.000Z",
    is_used: false,
  },
  {
    id: "i3",
    prize_template_id: "t1",
    item_index: 3,
    item_value: "CCC",
    source_type: "manual",
    expires_at: null,
    is_used: true,
    is_redeemed: true,
    redeemed_at: "2026-10-10T09:30:00Z",
  },
];

const onRefreshPrizes = vi.fn();

const view = (reward: PrizeTemplate, canEdit = true) => (
  <MemoryRouter>
    <RewardCodesView
      reward={reward}
      organizationId="org1"
      canEdit={canEdit}
      onRefreshPrizes={onRefreshPrizes}
    />
  </MemoryRouter>
);

const open = async (reward: PrizeTemplate = voucher, canEdit = true) => {
  const result = render(view(reward, canEdit));
  if (reward.category === "voucher") {
    await screen.findByRole("columnheader", { name: /Unique Code/ });
  } else {
    await screen.findByText("Winners & delivery");
  }
  return result;
};

beforeEach(() => {
  state.items = baseItems();
  state.loading = false;
  state.counts = { available: 1, used: 1, expired: 1 };
  for (const mock of Object.values(state.fn)) mock.mockClear();
  state.fn.generateRandomCodes.mockReturnValue({
    success: true,
    codes: ["GEN-0001"],
  });
  state.fn.executeImport.mockResolvedValue(true);
  state.fn.updateSingleItemValue.mockResolvedValue(true);
  state.fn.updateItemExpiry.mockResolvedValue(true);
  state.fn.setExpiryForAll.mockResolvedValue(2);
  onRefreshPrizes.mockClear();
  exporter.exportToCSV.mockClear();
  exporter.parseCSVFile.mockReset();
  exporter.parseExcelFile.mockReset();
});

const rowOf = (code: string) =>
  screen.getByLabelText<HTMLInputElement>(code).closest("tr")!;

describe("reward codes page", () => {
  it("is a page with a way back to the Local Library, not a dialog", async () => {
    await open();
    expect(screen.queryByRole("dialog")).toBeNull();
    const back = within(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).getByRole("link");
    expect(back.getAttribute("href")).toBe("/prizes/local");
    expect(
      screen.getByRole("link", { name: "Done" }).getAttribute("href"),
    ).toBe("/prizes/local");
    expect(
      screen.getByRole("heading", { name: "Ooredoo 500 DA" }),
    ).toBeTruthy();
    expect(screen.getByText("Digital Item")).toBeTruthy();
    expect(
      screen.getByText(/total units reserved in inventory/).textContent,
    ).toBe("Prepared Codes: 3 / 3 total units reserved in inventory.");
  });

  it("loads the codes of the reward, and again when the reward changes", async () => {
    const { rerender } = await open();
    expect(state.fn.loadTemplateItems).toHaveBeenCalledTimes(1);
    expect(state.fn.loadTemplateItems.mock.calls[0][0]).toMatchObject({
      id: "t1",
    });

    // The live list gives the same reward again (a refresh): nothing is reloaded.
    rerender(view({ ...voucher }));
    expect(state.fn.loadTemplateItems).toHaveBeenCalledTimes(1);

    // Its stock changed elsewhere: the slots are loaded again.
    rerender(view({ ...voucher, totalStock: 5 }));
    await waitFor(() =>
      expect(state.fn.loadTemplateItems).toHaveBeenCalledTimes(2),
    );
  });

  it("brings the library up to date when the page is left", async () => {
    const { unmount } = await open();
    expect(onRefreshPrizes).not.toHaveBeenCalled();
    unmount();
    expect(onRefreshPrizes).toHaveBeenCalledTimes(1);
  });
});

describe("reward codes page, the data table", () => {
  it("lists the codes with their number, expiry, status and actions", async () => {
    await open();
    const table = screen.getByRole("table", {
      name: "Codes of Ooredoo 500 DA",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent?.trim()),
    ).toEqual(["#", "Unique Code", "Expires", "Status", "Actions"]);
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(screen.getByLabelText<HTMLInputElement>("Code 1").value).toBe("AAA");
    expect(screen.getAllByText("Prepared")).toHaveLength(2);
  });

  it("marks a code already given: locked, red, with its status", async () => {
    await open();
    const given = screen.getByLabelText<HTMLInputElement>("Code 3");
    expect(given.disabled).toBe(true);
    expect(given.placeholder).toBe("Redeemed by player");
    expect(rowOf("Code 3").className).toContain("border-l-red-500");
    expect(rowOf("Code 1").className).not.toContain("border-l-red-500");
    expect(screen.getByText("Redeemed")).toBeTruthy();
  });

  it("shows winners instead of the code table for a physical reward", async () => {
    await open({ ...voucher, category: "physical", name: "Cap" });
    expect(await screen.findByText("Winners & delivery")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Codes of Cap" })).toBeNull();
    expect(screen.queryByPlaceholderText(/COUPON-DZ-101/)).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Expires" })).toBeNull();
  });

  it("lets a code be typed without losing the focus, and saves it when the field is left", async () => {
    await open();
    const input = screen.getByLabelText<HTMLInputElement>("Code 1");
    input.focus();
    fireEvent.change(input, { target: { value: "AAA-NEW" } });
    // Same field, still focused, showing what was typed.
    const after = screen.getByLabelText<HTMLInputElement>("Code 1");
    expect(after).toBe(input);
    expect(after.value).toBe("AAA-NEW");
    expect(document.activeElement).toBe(input);
    expect(state.fn.updateSingleItemValue).not.toHaveBeenCalled();

    fireEvent.blur(input);
    expect(state.fn.updateSingleItemValue).toHaveBeenCalledWith(
      "i1",
      "AAA-NEW",
    );
    expect(onRefreshPrizes).toHaveBeenCalled();
  });

  it("clears a code, and generates one for an empty slot", async () => {
    state.items = [
      ...baseItems().slice(0, 2),
      {
        id: "i4",
        prize_template_id: "t1",
        item_index: 4,
        item_value: null,
        source_type: "manual",
      },
    ];
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Clear code 1" }));
    await waitFor(() =>
      expect(state.fn.updateSingleItemValue).toHaveBeenCalledWith("i1", ""),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Generate a code for slot 4" }),
    );
    await waitFor(() =>
      expect(state.fn.updateSingleItemValue).toHaveBeenCalledWith(
        "i4",
        "GEN-0001",
      ),
    );
    expect(await screen.findByText("Generated code: GEN-0001")).toBeTruthy();
    expect(screen.getByText("Empty")).toBeTruthy();
  });

  it("searches by code or by number", async () => {
    await open();
    const search = screen.getByPlaceholderText("Search codes...");
    fireEvent.change(search, { target: { value: "bb" } });
    expect(screen.queryByLabelText("Code 1")).toBeNull();
    expect(screen.getByLabelText("Code 2")).toBeTruthy();

    fireEvent.change(search, { target: { value: "3" } });
    expect(screen.getByLabelText("Code 3")).toBeTruthy();
    expect(screen.queryByLabelText("Code 2")).toBeNull();

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(
      screen.getByText("No codes matching your search query."),
    ).toBeTruthy();
  });

  it("sorts by number, status or expiry, but never by the code being typed", async () => {
    await open();
    expect(screen.queryByRole("button", { name: /Unique Code/ })).toBeNull();
    const numbers = () =>
      screen
        .getAllByLabelText(/^Code \d+$/)
        .map((input) => (input as HTMLInputElement).value);
    expect(numbers()).toEqual(["AAA", "BBB", "CCC"]);

    // A number column sorts from the highest first, then back.
    const sortByNumber = screen.getByRole("button", { name: "#" });
    fireEvent.click(sortByNumber);
    expect(numbers()).toEqual(["CCC", "BBB", "AAA"]);
    expect(
      screen.getByRole("columnheader", { name: "#" }).getAttribute("aria-sort"),
    ).toBe("descending");
    fireEvent.click(sortByNumber);
    expect(numbers()).toEqual(["AAA", "BBB", "CCC"]);
    expect(
      screen.getByRole("columnheader", { name: "#" }).getAttribute("aria-sort"),
    ).toBe("ascending");

    fireEvent.click(screen.getByRole("button", { name: "Status" }));
    // Prepared before empty before redeemed.
    expect(numbers()[2]).toBe("CCC");
  });

  it("shows fifty codes at a time", async () => {
    state.items = Array.from({ length: 120 }, (_, index) => ({
      id: `i${index + 1}`,
      prize_template_id: "t1",
      item_index: index + 1,
      item_value: `CODE-${index + 1}`,
      source_type: "manual",
      expires_at: null,
      is_used: false,
    }));
    await open({ ...voucher, totalStock: 120 });
    expect(screen.getAllByLabelText(/^Code \d+$/)).toHaveLength(50);
    expect(screen.getByText("Rows 1–50 of 120")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Rows 51–100 of 120")).toBeTruthy();
    expect(screen.getByLabelText("Code 51")).toBeTruthy();
  });

  it("shows placeholders while the codes load", async () => {
    state.loading = true;
    render(view(voucher));
    expect(
      (await screen.findAllByTestId("data-table-skeleton")).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Code 1")).toBeNull();
  });

  it("says so when the reward has no slot yet", async () => {
    state.items = [];
    await open();
    expect(screen.getByText("This reward has no code slot yet.")).toBeTruthy();
  });

  it("is read-only for a viewer: nothing to type, clear, generate or set", async () => {
    await open(voucher, false);
    expect(screen.getByLabelText<HTMLInputElement>("Code 1").disabled).toBe(
      true,
    );
    expect(screen.queryByRole("button", { name: /Clear code/ })).toBeNull();
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 1").disabled,
    ).toBe(true);
    expect(screen.queryByLabelText("Expiry for all codes")).toBeNull();
    expect(screen.queryByRole("button", { name: "Change expiry" })).toBeNull();
  });
});

describe("reward codes page, the toolbar", () => {
  // Paste Bulk, Replace All and Auto-Fill Empty are hidden (commented out) in RewardCodesView
  // for now: their tests are skipped until the buttons come back.
  it.skip("opens the bulk paste, sends the lines and closes when they are applied", async () => {
    state.fn.validateImport.mockReturnValue({
      success: true,
      overflow: false,
      conflicts: [],
      importedCount: 2,
      itemsToSave: [{ id: "i1", item_value: "X1" }],
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Paste Bulk/ }));
    const area = screen.getByPlaceholderText(/COUPON-DZ-101/);
    fireEvent.change(area, { target: { value: "X1\nX2\n" } });
    fireEvent.click(screen.getByRole("button", { name: /Apply \(Append\)/ }));

    await waitFor(() => expect(state.fn.executeImport).toHaveBeenCalled());
    expect(state.fn.validateImport).toHaveBeenCalledWith(
      "append",
      { rawLines: ["X1", "X2"] },
      3,
    );
    expect(
      await screen.findByText(/Applied 2 code\(s\) in Append mode/),
    ).toBeTruthy();
    expect(screen.queryByPlaceholderText(/COUPON-DZ-101/)).toBeNull();
  });

  it.skip("switches to Replace All before importing", async () => {
    state.fn.validateImport.mockReturnValue({
      success: true,
      overflow: false,
      conflicts: [],
      importedCount: 1,
      itemsToSave: [{ id: "i1", item_value: "X1" }],
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Replace All" }));
    fireEvent.click(screen.getByRole("button", { name: /Paste Bulk/ }));
    fireEvent.change(screen.getByPlaceholderText(/COUPON-DZ-101/), {
      target: { value: "X1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Apply \(Replace All\)/ }),
    );
    await waitFor(() =>
      expect(state.fn.validateImport).toHaveBeenCalledWith(
        "replace",
        { rawLines: ["X1"] },
        3,
      ),
    );
  });

  it.skip("asks what to do about duplicate codes before importing", async () => {
    state.fn.validateImport.mockReturnValue({
      success: false,
      overflow: false,
      conflicts: [{ lineNumber: 1, code: "AAA", reason: "existing" }],
      importedCount: 1,
      itemsToSave: [],
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Paste Bulk/ }));
    fireEvent.change(screen.getByPlaceholderText(/COUPON-DZ-101/), {
      target: { value: "AAA" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Apply \(Append\)/ }));
    expect(
      await screen.findByText(/Duplicate Codes Detected \(1\)/),
    ).toBeTruthy();
    expect(state.fn.executeImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel Import" }));
    await waitFor(() =>
      expect(screen.queryByText(/Duplicate Codes Detected/)).toBeNull(),
    );
  });

  it("opens a small dialog to import a file, and imports nothing until a file is chosen", async () => {
    await open();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Import File" }));
    const dialog = screen.getByRole("dialog", { name: "Import codes" });
    expect(
      (
        within(dialog).getByRole("button", {
          name: "Import",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(exporter.parseCSVFile).not.toHaveBeenCalled();
  });

  it("imports the codes of the chosen file and says how many", async () => {
    exporter.parseCSVFile.mockResolvedValue([{ Code: "X1" }, { Code: "X2" }]);
    state.fn.validateImport.mockReturnValue({
      success: true,
      overflow: false,
      conflicts: [],
      importedCount: 2,
      itemsToSave: [{ id: "i1", item_value: "X1" }],
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Import File" }));
    const file = new File(["Code\nX1\nX2"], "codes.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("File to import"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(state.fn.executeImport).toHaveBeenCalled());
    expect(exporter.parseCSVFile).toHaveBeenCalledWith(file);
    expect(state.fn.validateImport).toHaveBeenCalledWith(
      "append",
      { rawRows: [{ Code: "X1" }, { Code: "X2" }] },
      3,
    );
    expect(screen.queryByRole("dialog", { name: "Import codes" })).toBeNull();
    expect(
      await screen.findByText(
        /Successfully imported 2 code\(s\) in Append mode/,
      ),
    ).toBeTruthy();
  });

  it("reads an Excel file with the Excel reader", async () => {
    exporter.parseExcelFile.mockResolvedValue([{ Code: "X1" }]);
    state.fn.validateImport.mockReturnValue({
      success: true,
      overflow: false,
      conflicts: [],
      importedCount: 1,
      itemsToSave: [{ id: "i1", item_value: "X1" }],
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Import File" }));
    const file = new File(["x"], "codes.xlsx");
    fireEvent.change(screen.getByLabelText("File to import"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() =>
      expect(exporter.parseExcelFile).toHaveBeenCalledWith(file),
    );
    expect(exporter.parseCSVFile).not.toHaveBeenCalled();
  });

  it("imports in Replace All mode when that is chosen in the dialog", async () => {
    exporter.parseCSVFile.mockResolvedValue([{ Code: "X1" }]);
    state.fn.validateImport.mockReturnValue({
      success: true,
      overflow: false,
      conflicts: [],
      importedCount: 1,
      itemsToSave: [{ id: "i1", item_value: "X1" }],
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Import File" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("radio", {
        name: "Replace All",
      }),
    );
    fireEvent.change(screen.getByLabelText("File to import"), {
      target: { files: [new File(["Code\nX1"], "codes.csv")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() =>
      expect(state.fn.validateImport).toHaveBeenCalledWith(
        "replace",
        { rawRows: [{ Code: "X1" }] },
        3,
      ),
    );
  });

  it("asks what to do about duplicate codes found in the file", async () => {
    exporter.parseCSVFile.mockResolvedValue([{ Code: "AAA" }]);
    state.fn.validateImport.mockReturnValue({
      success: false,
      overflow: false,
      conflicts: [{ lineNumber: 1, code: "AAA", reason: "existing" }],
      importedCount: 1,
      itemsToSave: [],
    });
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Import File" }));
    fireEvent.change(screen.getByLabelText("File to import"), {
      target: { files: [new File(["Code\nAAA"], "codes.csv")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(
      await screen.findByText(/Duplicate Codes Detected \(1\)/),
    ).toBeTruthy();
    expect(state.fn.executeImport).not.toHaveBeenCalled();
  });

  it("closes the import dialog without importing on Cancel", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Import File" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(exporter.parseCSVFile).not.toHaveBeenCalled();
  });

  it.skip("fills the empty slots with generated codes", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Auto-Fill Empty/ }));
    await waitFor(() =>
      expect(state.fn.fillEmptySlotsWithRandom).toHaveBeenCalled(),
    );
    expect(await screen.findByText(/Filled empty slots/)).toBeTruthy();
  });

  it("downloads the file at once when Export is clicked, with no dialog", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(exporter.exportToCSV).toHaveBeenCalledTimes(1);
  });

  it("exports the expiry date and whether each code is available, used or expired", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(exporter.exportToCSV).toHaveBeenCalledTimes(1);
    const [rows, filename] = exporter.exportToCSV.mock.calls[0];
    expect(filename).toMatch(/^octoreach_codes_Ooredoo_500_DA_/);
    expect(rows).toEqual([
      expect.objectContaining({
        Index: 1,
        Code: "AAA",
        Status: "Available",
        Expires: "2099-12-31",
      }),
      expect.objectContaining({
        Index: 2,
        Code: "BBB",
        Status: "Expired",
        Expires: "2020-01-01",
      }),
      expect.objectContaining({ Index: 3, Code: "CCC", Status: "Used" }),
    ]);
  });

  it("writes the validity period for a code not given yet, and the deadline of one that was", async () => {
    state.items = [
      {
        id: "i1",
        prize_template_id: "t1",
        item_index: 1,
        item_value: "AAA",
        source_type: "manual",
        expires_at: null,
        is_used: false,
      },
      {
        id: "i2",
        prize_template_id: "t1",
        item_index: 2,
        item_value: "BBB",
        source_type: "manual",
        expires_at: null,
        redemption_expires_at: "2099-08-01T22:59:59.000Z",
        is_used: true,
        is_redeemed: true,
      },
    ];
    await open({ ...voucher, expiryDays: 30 });
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    const [rows] = exporter.exportToCSV.mock.calls[0];
    expect(rows).toEqual([
      expect.objectContaining({
        Code: "AAA",
        Status: "Available",
        Expires: "1 month after delivery",
      }),
      expect.objectContaining({
        Code: "BBB",
        Status: "Used",
        Expires: "2099-08-01",
      }),
    ]);
  });
});

describe("reward codes page, expiry of the codes", () => {
  it("shows the expiry column, the Expired badge and the stock summary", async () => {
    await open();
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 1").value,
    ).toBe("2099-12-31");
    expect(screen.getAllByText("Expired")).toHaveLength(1);
    expect(screen.getByText(/available ·/).textContent).toBe(
      "1 available · 1 used · 1 expired",
    );
  });

  it("saves a date picked on one code", async () => {
    await open();
    fireEvent.change(screen.getByLabelText("Expiry date of code 1"), {
      target: { value: "2030-06-30" },
    });
    await waitFor(() =>
      expect(state.fn.updateItemExpiry).toHaveBeenCalledWith(
        "i1",
        "2030-06-30T22:59:59.000Z",
      ),
    );
  });

  it("does not let a code already given be edited", async () => {
    await open();
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 3").disabled,
    ).toBe(true);
  });

  // The expiry of the reward, and one date for all its codes, are changed from the reward form
  // (Edit) since 214d6f6: see PrizesManager and CodesExpiryFields.test.tsx.
  it("follows the reward as soon as it changes, without leaving the page", async () => {
    // Code 1 has no date of its own: it shows the reward's.
    state.items = baseItems().map((item) =>
      item.id === "i1" ? { ...item, expires_at: null } : item,
    );
    const { rerender } = await open({
      ...voucher,
      expiresAt: "2099-06-30T22:59:59.000Z",
    });
    const date = () =>
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 1").value;
    expect(date()).toBe("2099-06-30");

    rerender(view({ ...voucher, expiresAt: "2099-09-15T22:59:59.000Z" }));
    expect(date()).toBe("2099-09-15");

    // The reward switches to a period: the date is gone, the period is shown.
    rerender(view({ ...voucher, expiresAt: null, expiryDays: 14 }));
    expect(date()).toBe("");
    expect(
      screen.getAllByText("2 weeks after delivery").length,
    ).toBeGreaterThan(0);
  });

  it("shows the deadline fixed when a code was given, and the period of a code not given yet", async () => {
    state.items = [
      {
        id: "i1",
        prize_template_id: "t1",
        item_index: 1,
        item_value: "AAA",
        source_type: "manual",
        expires_at: null,
        is_used: false,
      },
      {
        id: "i2",
        prize_template_id: "t1",
        item_index: 2,
        item_value: "BBB",
        source_type: "manual",
        expires_at: null,
        redemption_expires_at: "2099-08-01T22:59:59.000Z",
        is_used: true,
        is_redeemed: true,
      },
    ];
    await open({ ...voucher, expiryDays: 30 });
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 1").value,
    ).toBe("");
    expect(
      screen.getAllByText("1 month after delivery").length,
    ).toBeGreaterThan(0);
    const given = screen.getByLabelText<HTMLInputElement>(
      "Expiry date of code 2",
    );
    expect(given.value).toBe("2099-08-01");
    expect(given.disabled).toBe(true);
    expect(screen.getByText("after delivery")).toBeTruthy();
  });
});

describe("reward codes page, a physical reward", () => {
  const physical: PrizeTemplate = {
    ...voucher,
    id: "t2",
    name: "Branded cap",
    category: "physical",
  };

  it("lists the winners with a delivery status, and no expiry panel or column", async () => {
    render(view(physical));
    await screen.findByText("Winners & delivery");
    expect(await screen.findByText("Ali")).toBeTruthy();
    expect(screen.getByLabelText("Delivery status of Ali")).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Expires" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Reward expiry" })).toBeNull();
    expect(screen.queryByText(/available ·/)).toBeNull();
  });

  it("is read-only for a viewer", async () => {
    render(view(physical, false));
    await screen.findByText("Winners & delivery");
    await screen.findByText("Ali");
    expect(screen.queryByLabelText("Delivery status of Ali")).toBeNull();
  });
});
