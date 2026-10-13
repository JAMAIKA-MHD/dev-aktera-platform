import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrizeTemplate } from "../../types";

type PrizeTemplatePayload = Omit<
  PrizeTemplate,
  "id" | "allocatedStock" | "availableStock"
>;

// The Reward Library's list of rewards: its cards, filter and form. The codes of a reward have
// their own page (RewardCodesView).
vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light" }),
}));
vi.mock("../common/ImageUploader", () => ({ ImageUploader: () => null }));

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

const onOpenReward = vi.fn();
const props = {
  prizes: [voucher],
  onAddPrize: async () => {},
  onUpdatePrize: async () => {},
  onDeletePrize: async () => {},
  onOpenReward,
};

beforeEach(() => {
  onOpenReward.mockClear();
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

describe("Reward Library, opening a reward", () => {
  it("asks to open the page of a reward when its card is clicked", () => {
    render(<PrizesManager {...props} />);
    fireEvent.click(screen.getByText("Ooredoo 500 DA"));
    expect(onOpenReward).toHaveBeenCalledTimes(1);
    expect(onOpenReward).toHaveBeenCalledWith(voucher);
  });

  it("opens a physical reward the same way", () => {
    const cap: PrizeTemplate = {
      ...voucher,
      id: "t2",
      name: "Branded cap",
      category: "physical",
    };
    render(<PrizesManager {...props} prizes={[voucher, cap]} />);
    fireEvent.click(screen.getByText("Branded cap"));
    expect(onOpenReward).toHaveBeenCalledWith(cap);
  });

  it("does not open it when the edit or details buttons of the card are used", () => {
    render(<PrizesManager {...props} />);
    fireEvent.click(screen.getByTitle("Edit reward template"));
    fireEvent.click(screen.getByTitle("View stock & campaign breakdown"));
    expect(onOpenReward).not.toHaveBeenCalled();
  });

  it("no longer carries a dialog for the codes", () => {
    render(<PrizesManager {...props} />);
    fireEvent.click(screen.getByText("Ooredoo 500 DA"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
