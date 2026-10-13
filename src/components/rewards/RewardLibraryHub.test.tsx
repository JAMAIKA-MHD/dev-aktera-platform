import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { PrizeTemplate } from "../../types";

const supabase = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("../../lib/supabase", () => ({ supabase }));

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

const renderHub = (prizes: PrizeTemplate[] = []) =>
  render(
    <MemoryRouter>
      <RewardLibraryHub prizes={prizes} />
    </MemoryRouter>,
  );

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
        .getAllByText(/^(Rewards|Digital codes|Physical|In stock)$/)
        .map((label) => [
          label.textContent,
          label.parentElement?.textContent?.replace(label.textContent!, ""),
        ]),
    );
    expect(stats).toEqual({
      Rewards: "3",
      "Digital codes": "2",
      Physical: "1",
      "In stock": "55",
    });
  });

  it("reaches no network: nothing is fetched for the partners", () => {
    renderHub();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
