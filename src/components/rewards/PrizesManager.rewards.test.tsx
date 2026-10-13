import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrizeTemplate } from "../../types";

type PrizeTemplatePayload = Omit<
  PrizeTemplate,
  "id" | "allocatedStock" | "availableStock"
>;

// The Reward Library's code modal, with the data hooks replaced: this checks the wiring of the
// expiry column and the stock summary, not the hooks (tested on their own).
const state = vi.hoisted(() => ({
  role: "manager" as "manager" | "viewer",
  items: [] as Record<string, unknown>[],
  updateItemExpiry: vi.fn().mockResolvedValue(true),
  setExpiryForAll: vi.fn().mockResolvedValue(2),
}));

vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light" }),
}));
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { role: state.role } }),
}));
vi.mock("../common/ImageUploader", () => ({ ImageUploader: () => null }));
const exporter = vi.hoisted(() => ({
  exportToCSV: vi.fn(),
  exportToExcel: vi.fn(),
  parseCSVFile: vi.fn(),
  parseExcelFile: vi.fn(),
}));
vi.mock("../../lib/exportUtils", () => exporter);
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
vi.mock("../../hooks/useInventoryManager", () => ({
  useInventoryManager: () => ({
    templateItems: state.items,
    setTemplateItems: vi.fn(),
    loading: false,
    saving: false,
    error: null,
    unresolvedConflicts: [],
    clearUnresolvedConflicts: vi.fn(),
    loadTemplateItems: vi.fn().mockResolvedValue([]),
    updateSingleItemValue: vi.fn(),
    updateItemExpiry: state.updateItemExpiry,
    setExpiryForAll: state.setExpiryForAll,
    codeCounts: { available: 1, used: 1, expired: 1 },
    validateImport: vi.fn(),
    resolveConflict: vi.fn(),
    executeImport: vi.fn(),
    generateRandomCodes: vi.fn(),
    fillEmptySlotsWithRandom: vi.fn(),
  }),
}));

import { PrizesManager } from "../PrizesManager";

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

const props = {
  prizes: [voucher],
  onAddPrize: async () => {},
  onUpdatePrize: async () => {},
  onDeletePrize: async () => {},
};

beforeEach(() => {
  state.role = "manager";
  state.updateItemExpiry.mockClear();
  state.setExpiryForAll.mockClear();
  state.items = [
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
    },
  ];
});

const openModal = async () => {
  render(<PrizesManager {...props} />);
  fireEvent.click(screen.getByText("Ooredoo 500 DA"));
  await screen.findByRole("columnheader", { name: "Expires" });
};

describe("Reward Library, digital code modal", () => {
  it("shows the expiry column, the Expired badge and the stock summary", async () => {
    await openModal();
    expect(
      (screen.getByLabelText("Expiry date of code 1") as HTMLInputElement)
        .value,
    ).toBe("2099-12-31");
    expect(screen.getAllByText("Expired")).toHaveLength(1);
    expect(screen.getByText(/available ·/).textContent).toBe(
      "1 available · 1 used · 1 expired",
    );
  });

  it("saves a date picked on one code", async () => {
    await openModal();
    fireEvent.change(screen.getByLabelText("Expiry date of code 1"), {
      target: { value: "2030-06-30" },
    });
    await waitFor(() =>
      expect(state.updateItemExpiry).toHaveBeenCalledWith(
        "i1",
        "2030-06-30T22:59:59.000Z",
      ),
    );
  });

  it("does not let a code already given be edited", async () => {
    await openModal();
    expect(
      (screen.getByLabelText("Expiry date of code 3") as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it("applies one date to all codes of the reward", async () => {
    await openModal();
    fireEvent.change(screen.getByLabelText("Expiry for all codes"), {
      target: { value: "2099-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply to all codes" }));
    await waitFor(() =>
      expect(state.setExpiryForAll).toHaveBeenCalledWith(
        voucher,
        "2099-01-01T22:59:59.000Z",
        true,
      ),
    );
  });

  it("is read-only for a viewer", async () => {
    state.role = "viewer";
    await openModal();
    expect(
      (screen.getByLabelText("Expiry date of code 1") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByLabelText("Expiry for all codes")).toBeNull();
  });
});

describe("Reward Library, physical reward modal", () => {
  const physical: PrizeTemplate = {
    ...voucher,
    id: "t2",
    name: "Branded cap",
    category: "physical",
  };

  const openPhysical = async (role: "manager" | "viewer") => {
    state.role = role;
    render(
      <PrizesManager {...props} prizes={[physical]} organizationId="org1" />,
    );
    fireEvent.click(screen.getByText("Branded cap"));
    await screen.findByText("Winners & delivery");
  };

  it("lists the winners with a delivery status, and no expiry column", async () => {
    await openPhysical("manager");
    expect(await screen.findByText("Ali")).toBeTruthy();
    expect(screen.getByLabelText("Delivery status of Ali")).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Expires" })).toBeNull();
    expect(screen.queryByText(/available ·/)).toBeNull();
  });

  it("is read-only for a viewer", async () => {
    await openPhysical("viewer");
    await screen.findByText("Ali");
    expect(screen.queryByLabelText("Delivery status of Ali")).toBeNull();
  });
});

describe("Reward Library, cards", () => {
  const longName =
    "SUPERCALIFRAGILISTIC-EXTRA-LONG-REWARD-NAME-WITHOUT-ANY-SPACE-TO-BREAK-ON-A-SMALL-CARD";
  const prizes: PrizeTemplate[] = [
    { ...voucher, id: "v1", name: "Ooredoo 500 DA" },
    { ...voucher, id: "p1", name: "Branded cap", category: "physical" },
    { ...voucher, id: "v2", name: longName },
  ];

  const renderCards = () =>
    render(<PrizesManager {...props} prizes={prizes} />);
  const visible = (name: string) => screen.queryByText(name) !== null;

  it("tells a digital code from a physical reward on the card", () => {
    renderCards();
    expect(screen.getAllByText("Digital code")).toHaveLength(2);
    expect(screen.getAllByText("Physical reward")).toHaveLength(1);
  });

  it("shows every reward by default and filters by type", () => {
    renderCards();
    expect(visible("Ooredoo 500 DA")).toBe(true);
    expect(visible("Branded cap")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Digital codes/ }));
    expect(visible("Ooredoo 500 DA")).toBe(true);
    expect(visible("Branded cap")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /Physical/ }));
    expect(visible("Ooredoo 500 DA")).toBe(false);
    expect(visible("Branded cap")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(visible("Ooredoo 500 DA")).toBe(true);
    expect(visible("Branded cap")).toBe(true);
  });

  it("counts the rewards of each type on the filter", () => {
    renderCards();
    expect(
      screen.getByRole("button", { name: /Digital codes/ }).textContent,
    ).toBe("Digital codes2");
    expect(screen.getByRole("button", { name: /Physical/ }).textContent).toBe(
      "Physical1",
    );
    expect(screen.getByRole("button", { name: /^All/ }).textContent).toBe(
      "All3",
    );
  });

  it("combines the type filter with the search", () => {
    renderCards();
    fireEvent.change(screen.getByPlaceholderText(/Filter rewards/), {
      target: { value: "cap" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Digital codes/ }));
    expect(visible("Branded cap")).toBe(false);
    expect(screen.queryAllByText("Digital code")).toHaveLength(0);
  });

  it("keeps a very long name inside its card: wraps anywhere, two lines at most, full name on hover", () => {
    renderCards();
    const name = screen.getByText(longName);
    expect(name.className).toContain("line-clamp-2");
    expect(name.className).toContain("[overflow-wrap:anywhere]");
    expect(name.getAttribute("title")).toBe(longName);
    // Every flex ancestor up to the card may shrink, so the grid column never widens.
    const card = name.closest(".overflow-hidden");
    expect(card?.className).toContain("min-w-0");
  });
});

describe("Reward Library, expiry in the reward form", () => {
  const callbacks = () => ({
    onAddPrize: vi.fn().mockResolvedValue(undefined),
    onUpdatePrize: vi.fn().mockResolvedValue(undefined),
  });
  const fill = (
    onAdd: (payload: PrizeTemplatePayload) => Promise<void>,
    onUpdate: (id: string, payload: PrizeTemplatePayload) => Promise<void>,
    prizes: PrizeTemplate[] = [],
  ) => {
    render(
      <PrizesManager
        {...props}
        prizes={prizes}
        onAddPrize={onAdd}
        onUpdatePrize={onUpdate}
      />,
    );
  };
  const openCreator = () =>
    fireEvent.click(screen.getByRole("button", { name: /Add Custom Reward/ }));
  const typeBasics = () => {
    fireEvent.change(screen.getByPlaceholderText(/Djezzy/), {
      target: { value: "Djezzy 1500 DA" },
    });
    fireEvent.change(screen.getByPlaceholderText(/36,666/), {
      target: { value: "1500 DA" },
    });
  };
  const choose = (name: RegExp) => fireEvent.click(screen.getByLabelText(name));
  const save = () =>
    fireEvent.click(screen.getByRole("button", { name: "Save to Library" }));

  it("offers three ways to expire for a digital reward, with no expiry chosen", () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    expect(
      (screen.getByLabelText(/No expiry/) as HTMLInputElement).checked,
    ).toBe(true);
    expect(screen.getByLabelText(/On a fixed date/)).toBeTruthy();
    expect(screen.getByLabelText(/After delivery/)).toBeTruthy();
    expect(screen.queryByLabelText("Expiry date")).toBeNull();
    expect(screen.queryByLabelText("Validity period")).toBeNull();
  });

  it("shows the date field for a fixed date, the period fields for after delivery", () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    choose(/On a fixed date/);
    expect(
      (screen.getByLabelText("Expiry date") as HTMLInputElement).type,
    ).toBe("date");
    expect(screen.queryByLabelText("Validity period")).toBeNull();

    choose(/After delivery/);
    expect(screen.queryByLabelText("Expiry date")).toBeNull();
    expect(screen.getByLabelText("Validity period")).toBeTruthy();
    expect(screen.getByLabelText("Validity unit")).toBeTruthy();
    expect(
      screen.getByText(/countdown starts when the code is given/),
    ).toBeTruthy();
  });

  it("does not ask for it on a physical reward, and brings it back for a digital one", () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    fireEvent.click(screen.getByRole("button", { name: /Physical Item/ }));
    expect(screen.queryByText("Expiry of the codes")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Digital Voucher/ }));
    expect(screen.getByText("Expiry of the codes")).toBeTruthy();
  });

  it("creates the reward with no expiry by default", async () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    typeBasics();
    save();
    await waitFor(() => expect(onAddPrize).toHaveBeenCalled());
    expect(onAddPrize.mock.calls[0][0]).toMatchObject({
      expiresAt: null,
      expiryDays: null,
    });
  });

  it("creates the reward with a fixed date, as the end of that day in Algiers", async () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    typeBasics();
    choose(/On a fixed date/);
    fireEvent.change(screen.getByLabelText("Expiry date"), {
      target: { value: "2099-12-31" },
    });
    save();
    await waitFor(() => expect(onAddPrize).toHaveBeenCalled());
    expect(onAddPrize.mock.calls[0][0]).toMatchObject({
      name: "Djezzy 1500 DA",
      category: "voucher",
      expiresAt: "2099-12-31T22:59:59.000Z",
      expiryDays: null,
    });
  });

  it("creates the reward valid for a period after delivery", async () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    typeBasics();
    choose(/After delivery/);
    fireEvent.change(screen.getByLabelText("Validity period"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Validity unit"), {
      target: { value: "weeks" },
    });
    save();
    await waitFor(() => expect(onAddPrize).toHaveBeenCalled());
    expect(onAddPrize.mock.calls[0][0]).toMatchObject({
      expiresAt: null,
      expiryDays: 14,
    });
  });

  it("does not save a period that is not a whole number, and says so", async () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    typeBasics();
    choose(/After delivery/);
    fireEvent.change(screen.getByLabelText("Validity period"), {
      target: { value: "0" },
    });
    expect(
      screen.getByLabelText("Validity period").getAttribute("aria-invalid"),
    ).toBe("true");
    save();
    expect(
      await screen.findByText(/Enter a whole number of days/),
    ).toBeTruthy();
    expect(onAddPrize).not.toHaveBeenCalled();
  });

  it("does not save a fixed date that was not picked", async () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    typeBasics();
    choose(/On a fixed date/);
    save();
    expect(await screen.findByText("Pick the expiry date.")).toBeTruthy();
    expect(onAddPrize).not.toHaveBeenCalled();
  });

  it("sends no expiry for a physical reward, even after one was chosen", async () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    typeBasics();
    choose(/After delivery/);
    fireEvent.click(screen.getByRole("button", { name: /Physical Item/ }));
    save();
    await waitFor(() => expect(onAddPrize).toHaveBeenCalled());
    expect(onAddPrize.mock.calls[0][0]).toMatchObject({
      category: "physical",
      expiresAt: null,
      expiryDays: null,
    });
  });

  it("warns, without blocking, about a date in the past", () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize);
    openCreator();
    choose(/On a fixed date/);
    fireEvent.change(screen.getByLabelText("Expiry date"), {
      target: { value: "2020-01-01" },
    });
    expect(screen.getByText(/in the past/)).toBeTruthy();
  });

  it("brings back what was saved when the reward is edited, whichever way it expires", async () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize, [
      { ...voucher, expiresAt: "2099-06-30T22:59:59.000Z" },
    ]);
    fireEvent.click(screen.getByTitle("Edit reward template"));
    expect(
      (screen.getByLabelText(/On a fixed date/) as HTMLInputElement).checked,
    ).toBe(true);
    const field = screen.getByLabelText<HTMLInputElement>("Expiry date");
    expect(field.value).toBe("2099-06-30");

    fireEvent.change(field, { target: { value: "2099-07-15" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Update Library Template" }),
    );
    await waitFor(() => expect(onUpdatePrize).toHaveBeenCalled());
    expect(onUpdatePrize.mock.calls[0][1]).toMatchObject({
      expiresAt: "2099-07-15T22:59:59.000Z",
      expiryDays: null,
    });
  });

  it("edits a reward valid for a period, and can switch it to a date", async () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize, [{ ...voucher, expiryDays: 60 }]);
    fireEvent.click(screen.getByTitle("Edit reward template"));
    expect(
      (screen.getByLabelText(/After delivery/) as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Validity period") as HTMLInputElement).value,
    ).toBe("2");
    expect(
      (screen.getByLabelText("Validity unit") as HTMLSelectElement).value,
    ).toBe("months");

    choose(/On a fixed date/);
    fireEvent.change(screen.getByLabelText("Expiry date"), {
      target: { value: "2099-12-31" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Update Library Template" }),
    );
    await waitFor(() => expect(onUpdatePrize).toHaveBeenCalled());
    expect(onUpdatePrize.mock.calls[0][1]).toMatchObject({
      expiresAt: "2099-12-31T22:59:59.000Z",
      expiryDays: null,
    });
  });

  it("shows the expiry on the reward card, whichever way it is set", () => {
    const { onAddPrize, onUpdatePrize } = callbacks();
    fill(onAddPrize, onUpdatePrize, [
      {
        ...voucher,
        id: "a",
        name: "Dated",
        expiresAt: "2099-06-30T22:59:59.000Z",
      },
      { ...voucher, id: "b", name: "Period", expiryDays: 30 },
      {
        ...voucher,
        id: "c",
        name: "Lapsed",
        expiresAt: "2020-01-01T22:59:59.000Z",
      },
    ]);
    expect(screen.getByText(/Codes expire 2099-06-30/)).toBeTruthy();
    expect(
      screen.getByText(/Codes valid 1 month after\s+delivery/),
    ).toBeTruthy();
    expect(screen.getByText(/Expired 2020-01-01/)).toBeTruthy();
  });
});

describe("Reward Library, expiry of the open reward", () => {
  const withCodes = () => {
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
  };
  const open = async (
    reward: PrizeTemplate,
    onUpdatePrize = vi.fn().mockResolvedValue(undefined),
  ) => {
    const view = render(
      <PrizesManager
        {...props}
        prizes={[reward]}
        onUpdatePrize={onUpdatePrize}
      />,
    );
    fireEvent.click(screen.getByText(reward.name));
    await screen.findByRole("columnheader", { name: "Expires" });
    return { ...view, onUpdatePrize };
  };

  it("says at the top how the codes of the reward expire", async () => {
    withCodes();
    await open({ ...voucher, expiresAt: "2099-06-30T22:59:59.000Z" });
    const panel = screen.getByRole("region", { name: "Reward expiry" });
    expect(panel.textContent).toContain("until 2099-06-30");
  });

  it("says it for a period, and for no expiry", async () => {
    withCodes();
    const { unmount } = await open({ ...voucher, expiryDays: 30 });
    expect(
      screen.getByRole("region", { name: "Reward expiry" }).textContent,
    ).toContain("1 month after delivery");
    unmount();
    await open(voucher);
    expect(
      screen.getByRole("region", { name: "Reward expiry" }).textContent,
    ).toContain("no expiry");
  });

  it("changes the expiry from the codes window, keeping the rest of the reward", async () => {
    withCodes();
    const { onUpdatePrize } = await open({
      ...voucher,
      expiresAt: "2099-06-30T22:59:59.000Z",
    });
    fireEvent.click(screen.getByRole("button", { name: "Change expiry" }));
    // The editor starts from what is saved.
    expect(
      (screen.getByLabelText(/On a fixed date/) as HTMLInputElement).checked,
    ).toBe(true);
    fireEvent.click(screen.getByLabelText(/After delivery/));
    fireEvent.change(screen.getByLabelText("Validity period"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save expiry" }));

    await waitFor(() => expect(onUpdatePrize).toHaveBeenCalled());
    expect(onUpdatePrize.mock.calls[0][0]).toBe("t1");
    expect(onUpdatePrize.mock.calls[0][1]).toMatchObject({
      name: "Ooredoo 500 DA",
      category: "voucher",
      totalStock: 3,
      expiresAt: null,
      expiryDays: 10,
    });
    expect(
      await within(
        screen.getByRole("region", { name: "Reward expiry" }),
      ).findByRole("status"),
    ).toBeTruthy();
  });

  it("keeps the editor open and says why when the expiry cannot be saved", async () => {
    withCodes();
    const failing = vi
      .fn()
      .mockRejectedValue(new Error("Reward template could not be found."));
    await open(voucher, failing);
    fireEvent.click(screen.getByRole("button", { name: "Change expiry" }));
    fireEvent.click(screen.getByLabelText(/On a fixed date/));
    fireEvent.change(screen.getByLabelText("Expiry date"), {
      target: { value: "2099-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save expiry" }));
    expect(
      await screen.findByText("Reward template could not be found."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save expiry" })).toBeTruthy();
  });

  it("is read-only for a viewer", async () => {
    withCodes();
    state.role = "viewer";
    await open({ ...voucher, expiresAt: "2099-06-30T22:59:59.000Z" });
    expect(screen.getByRole("region", { name: "Reward expiry" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Change expiry" })).toBeNull();
  });

  it("has no expiry panel for a physical reward", async () => {
    state.role = "manager";
    render(
      <PrizesManager
        {...props}
        prizes={[{ ...voucher, id: "t9", name: "Cap", category: "physical" }]}
      />,
    );
    fireEvent.click(screen.getByText("Cap"));
    await screen.findByText("Winners & delivery");
    expect(screen.queryByRole("region", { name: "Reward expiry" })).toBeNull();
  });

  it("follows the reward as soon as it changes, without closing the window", async () => {
    withCodes();
    const { rerender } = await open({
      ...voucher,
      expiresAt: "2099-06-30T22:59:59.000Z",
    });
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 1").value,
    ).toBe("2099-06-30");

    rerender(
      <PrizesManager
        {...props}
        prizes={[{ ...voucher, expiresAt: "2099-09-15T22:59:59.000Z" }]}
      />,
    );
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 1").value,
    ).toBe("2099-09-15");
    expect(
      screen.getByRole("region", { name: "Reward expiry" }).textContent,
    ).toContain("until 2099-09-15");

    // The reward switches to a period: the code shows it, and the date is gone.
    rerender(
      <PrizesManager
        {...props}
        prizes={[{ ...voucher, expiresAt: null, expiryDays: 14 }]}
      />,
    );
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 1").value,
    ).toBe("");
    expect(
      screen.getAllByText("2 weeks after delivery").length,
    ).toBeGreaterThan(0);
  });

  it("shows the deadline fixed when a code was given, and the period of a code not given yet", async () => {
    withCodes();
    await open({ ...voucher, expiryDays: 30 });
    // Code 1 is not given yet: no date, the period still to come.
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 1").value,
    ).toBe("");
    expect(
      screen.getAllByText("1 month after delivery").length,
    ).toBeGreaterThan(1);
    // Code 2 was given: the deadline set at that moment, which cannot be edited.
    const given = screen.getByLabelText<HTMLInputElement>(
      "Expiry date of code 2",
    );
    expect(given.value).toBe("2099-08-01");
    expect(given.disabled).toBe(true);
    expect(screen.getByText("after delivery")).toBeTruthy();
  });
});

describe("Reward Library, export of the codes", () => {
  it("exports the expiry date and whether each code is available, used or expired", async () => {
    exporter.exportToCSV.mockClear();
    render(<PrizesManager {...props} />);
    fireEvent.click(screen.getByText("Ooredoo 500 DA"));
    await screen.findByRole("columnheader", { name: "Expires" });
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));

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
    exporter.exportToCSV.mockClear();
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
    render(
      <PrizesManager {...props} prizes={[{ ...voucher, expiryDays: 30 }]} />,
    );
    fireEvent.click(screen.getByText("Ooredoo 500 DA"));
    await screen.findByRole("columnheader", { name: "Expires" });
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
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
