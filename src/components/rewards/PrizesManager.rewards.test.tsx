import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrizeTemplate } from "../../types";

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
