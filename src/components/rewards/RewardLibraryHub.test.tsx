import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrizeTemplate, RewardPartner } from "../../types";

const supabase = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("../../lib/supabase", () => ({ supabase }));

const partnerHook = vi.hoisted(() => ({
  partners: [] as unknown[],
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../../hooks/useRewardPartners", () => ({
  useRewardPartners: () => partnerHook,
}));

import { RewardLibraryHub } from "./RewardLibraryHub";

const prize = (over: Partial<PrizeTemplate>): PrizeTemplate => ({
  id: "x",
  name: "Reward",
  category: "voucher",
  description: "",
  totalStock: 10,
  availableStock: 10,
  allocatedStock: 0,
  itemValue: "",
  ...over,
});

const renderHub = (
  prizes: PrizeTemplate[] = [],
  props: { canManage?: boolean } = {},
) =>
  render(
    <MemoryRouter>
      <RewardLibraryHub prizes={prizes} organizationId="org1" {...props} />
    </MemoryRouter>,
  );

const partner = (over: Partial<RewardPartner> = {}): RewardPartner => ({
  id: "p1",
  name: "Acme Gifts",
  description: "Gift cards",
  websiteUrl: "https://www.acme.example/shop",
  contactName: "Sara",
  contactEmail: "sara@acme.example",
  contactPhone: "0551234567",
  createdAt: "2026-10-13T10:00:00Z",
  ...over,
});

beforeEach(() => {
  partnerHook.partners = [];
  partnerHook.loading = false;
  partnerHook.error = null;
  partnerHook.add.mockReset().mockResolvedValue(undefined);
  partnerHook.remove.mockReset().mockResolvedValue(undefined);
  partnerHook.reload.mockReset();
});

describe("RewardLibraryHub", () => {
  it("offers the Local Library as a real link to its own page", () => {
    renderHub();
    const local = screen.getByRole("link", { name: /Local Library/ });
    expect(local.getAttribute("href")).toBe("/prizes/local");
  });

  it("shows Gifty, Yassir and Chargily as Coming soon, with nothing to click", () => {
    renderHub();
    for (const name of ["Gifty", "Yassir", "Chargily"]) {
      const card = screen.getByRole("listitem", {
        name: `${name}: coming soon`,
      });
      expect(within(card).getByText("Coming soon")).toBeTruthy();
      expect(within(card).queryAllByRole("link")).toHaveLength(0);
    }
    expect(screen.getAllByText("Coming soon")).toHaveLength(3);
    // The only link of the page is the Local Library.
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("summarises the local library", () => {
    renderHub([
      prize({ id: "a", category: "voucher", availableStock: 40 }),
      prize({ id: "b", category: "voucher", availableStock: 10 }),
      prize({ id: "c", category: "physical", availableStock: 5 }),
    ]);
    const stats = Object.fromEntries(
      screen
        .getAllByText(/^(Rewards|Digital Items|Physical Items|In stock)$/)
        .map((label) => [
          label.textContent,
          label.parentElement?.textContent?.replace(label.textContent!, ""),
        ]),
    );
    expect(stats).toEqual({
      Rewards: "3",
      "Digital Items": "2",
      "Physical Items": "1",
      "In stock": "55",
    });
  });

  it("reaches no network: nothing is fetched for the partners", () => {
    renderHub();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("lets a manager add a partner from a form, and shows it", async () => {
    renderHub([], { canManage: true });
    fireEvent.click(screen.getByRole("button", { name: "Add a partner" }));
    const dialog = screen.getByRole("dialog", { name: "Add a partner" });
    fireEvent.change(within(dialog).getByLabelText(/Partner name/), {
      target: { value: "Gifty" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add partner" }),
    );
    await waitFor(() => expect(partnerHook.add).toHaveBeenCalled());
    expect(partnerHook.add.mock.calls[0][0]).toMatchObject({
      name: "Gifty",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("offers no way to add or remove a partner to a viewer, who still sees the list", () => {
    partnerHook.partners = [partner()];
    renderHub([], { canManage: false });
    expect(screen.queryByRole("button", { name: "Add a partner" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
    expect(
      screen.getByRole("listitem", { name: "Acme Gifts: your partner" }),
    ).toBeTruthy();
  });

  it("shows the partners the brand added, apart from the ones coming soon", () => {
    partnerHook.partners = [partner()];
    renderHub();
    const card = screen.getByRole("listitem", {
      name: "Acme Gifts: your partner",
    });
    expect(within(card).getByText("Not connected yet")).toBeTruthy();
    expect(within(card).getByText("Gift cards")).toBeTruthy();
    const site = within(card).getByRole("link", { name: "acme.example" });
    expect(site.getAttribute("href")).toBe("https://www.acme.example/shop");
    expect(site.getAttribute("target")).toBe("_blank");
    expect(site.getAttribute("rel")).toContain("noopener");
    expect(
      within(card)
        .getByRole("link", { name: "sara@acme.example" })
        .getAttribute("href"),
    ).toBe("mailto:sara@acme.example");
    // The three built-in partners are still "Coming soon".
    expect(screen.getAllByText("Coming soon")).toHaveLength(3);
  });

  it("removes a partner only after a confirmation", async () => {
    partnerHook.partners = [partner()];
    renderHub([], { canManage: true });
    fireEvent.click(screen.getByRole("button", { name: "Remove Acme Gifts" }));
    expect(partnerHook.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(screen.queryByText("Remove this partner?")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Remove Acme Gifts" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(partnerHook.remove).toHaveBeenCalledWith("p1"));
  });

  it("says why a partner could not be removed", async () => {
    partnerHook.partners = [partner()];
    partnerHook.remove.mockRejectedValue(
      new Error("You are not allowed to remove this partner."),
    );
    renderHub([], { canManage: true });
    fireEvent.click(screen.getByRole("button", { name: "Remove Acme Gifts" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      await screen.findByText("You are not allowed to remove this partner."),
    ).toBeTruthy();
  });

  it("keeps a very long partner name inside its card", () => {
    const longName = "A".repeat(80);
    partnerHook.partners = [partner({ name: longName })];
    renderHub();
    const title = screen.getByTitle(longName);
    expect(title.className).toContain("line-clamp-2");
    expect(title.className).toContain("[overflow-wrap:anywhere]");
  });

  it("shows a retry when the partners cannot be loaded", () => {
    partnerHook.error = "We could not load your partners. Please try again.";
    renderHub();
    expect(screen.getByRole("alert").textContent).toContain(
      "could not load your partners",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(partnerHook.reload).toHaveBeenCalled();
  });
});
