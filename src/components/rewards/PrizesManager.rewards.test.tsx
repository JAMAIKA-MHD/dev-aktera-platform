import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("Reward Library, expiry date in the reward form", () => {
  const openForm = () => {
    const onAddPrize = vi.fn().mockResolvedValue(undefined);
    const onUpdatePrize = vi.fn().mockResolvedValue(undefined);
    return { onAddPrize, onUpdatePrize };
  };
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
  const typeBasics = () => {
    fireEvent.change(screen.getByPlaceholderText(/Djezzy/), {
      target: { value: "Djezzy 1500 DA" },
    });
    fireEvent.change(screen.getByPlaceholderText(/36,666/), {
      target: { value: "1500 DA" },
    });
  };

  it("asks for an optional expiry date when the reward is a digital code", () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    fill(onAddPrize, onUpdatePrize);
    fireEvent.click(screen.getByRole("button", { name: /Add Custom Reward/ }));
    // Digital voucher is the default category.
    const field = screen.getByLabelText<HTMLInputElement>(
      "Expiry date (optional)",
    );
    expect(field.type).toBe("date");
    expect(field.value).toBe("");
  });

  it("does not ask for it on a physical reward, and brings it back for a digital one", () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    fill(onAddPrize, onUpdatePrize);
    fireEvent.click(screen.getByRole("button", { name: /Add Custom Reward/ }));
    fireEvent.click(screen.getByRole("button", { name: /Physical Item/ }));
    expect(screen.queryByLabelText("Expiry date (optional)")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Digital Voucher/ }));
    expect(screen.getByLabelText("Expiry date (optional)")).toBeTruthy();
  });

  it("creates the reward with the date, as the end of that day in Algiers", async () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    fill(onAddPrize, onUpdatePrize);
    fireEvent.click(screen.getByRole("button", { name: /Add Custom Reward/ }));
    typeBasics();
    fireEvent.change(screen.getByLabelText("Expiry date (optional)"), {
      target: { value: "2099-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save to Library" }));
    await waitFor(() => expect(onAddPrize).toHaveBeenCalled());
    expect(onAddPrize.mock.calls[0][0]).toMatchObject({
      name: "Djezzy 1500 DA",
      category: "voucher",
      expiresAt: "2099-12-31T22:59:59.000Z",
    });
  });

  it("creates the reward without a date when none is picked", async () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    fill(onAddPrize, onUpdatePrize);
    fireEvent.click(screen.getByRole("button", { name: /Add Custom Reward/ }));
    typeBasics();
    fireEvent.click(screen.getByRole("button", { name: "Save to Library" }));
    await waitFor(() => expect(onAddPrize).toHaveBeenCalled());
    expect(onAddPrize.mock.calls[0][0].expiresAt).toBeNull();
  });

  it("sends no date for a physical reward, even after one was picked", async () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    fill(onAddPrize, onUpdatePrize);
    fireEvent.click(screen.getByRole("button", { name: /Add Custom Reward/ }));
    typeBasics();
    fireEvent.change(screen.getByLabelText("Expiry date (optional)"), {
      target: { value: "2099-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Physical Item/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save to Library" }));
    await waitFor(() => expect(onAddPrize).toHaveBeenCalled());
    expect(onAddPrize.mock.calls[0][0]).toMatchObject({
      category: "physical",
      expiresAt: null,
    });
  });

  it("warns, without blocking, about a date in the past", () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    fill(onAddPrize, onUpdatePrize);
    fireEvent.click(screen.getByRole("button", { name: /Add Custom Reward/ }));
    fireEvent.change(screen.getByLabelText("Expiry date (optional)"), {
      target: { value: "2020-01-01" },
    });
    expect(screen.getByText(/in the past/)).toBeTruthy();
  });

  it("can clear the date it picked", () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    fill(onAddPrize, onUpdatePrize);
    fireEvent.click(screen.getByRole("button", { name: /Add Custom Reward/ }));
    const field = screen.getByLabelText<HTMLInputElement>(
      "Expiry date (optional)",
    );
    fireEvent.change(field, { target: { value: "2099-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(field.value).toBe("");
  });

  it("shows the saved date when the reward is edited, and saves a new one", async () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    const withDate: PrizeTemplate = {
      ...voucher,
      expiresAt: "2099-06-30T22:59:59.000Z",
    };
    fill(onAddPrize, onUpdatePrize, [withDate]);
    fireEvent.click(screen.getByTitle("Edit reward template"));
    const field = screen.getByLabelText<HTMLInputElement>(
      "Expiry date (optional)",
    );
    expect(field.value).toBe("2099-06-30");

    fireEvent.change(field, { target: { value: "2099-07-15" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Update Library Template" }),
    );
    await waitFor(() => expect(onUpdatePrize).toHaveBeenCalled());
    expect(onUpdatePrize.mock.calls[0][0]).toBe("t1");
    expect(onUpdatePrize.mock.calls[0][1].expiresAt).toBe(
      "2099-07-15T22:59:59.000Z",
    );
  });

  it("shows the date on the reward card", () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    fill(onAddPrize, onUpdatePrize, [
      { ...voucher, expiresAt: "2099-06-30T22:59:59.000Z" },
    ]);
    expect(screen.getByText(/Codes expire 2099-06-30/)).toBeTruthy();
  });

  it("marks a reward whose date has passed", () => {
    const { onAddPrize, onUpdatePrize } = openForm();
    fill(onAddPrize, onUpdatePrize, [
      { ...voucher, expiresAt: "2020-01-01T22:59:59.000Z" },
    ]);
    expect(screen.getByText(/Expired 2020-01-01/)).toBeTruthy();
  });

  it("still lets a single code take its own date after creation", async () => {
    const { onAddPrize, onUpdatePrize } = openForm();
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
    ];
    fill(onAddPrize, onUpdatePrize, [
      { ...voucher, expiresAt: "2099-06-30T22:59:59.000Z" },
    ]);
    fireEvent.click(screen.getByText("Ooredoo 500 DA"));
    const cell = await screen.findByLabelText<HTMLInputElement>(
      "Expiry date of code 1",
    );
    // The code has no date of its own: it shows the reward's.
    expect(cell.value).toBe("2099-06-30");
    expect(screen.getByText("from reward")).toBeTruthy();
    fireEvent.change(cell, { target: { value: "2099-08-01" } });
    await waitFor(() =>
      expect(state.updateItemExpiry).toHaveBeenCalledWith(
        "i1",
        "2099-08-01T22:59:59.000Z",
      ),
    );
  });
});
