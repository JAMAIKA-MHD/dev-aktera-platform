import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  channel: vi.fn(),
}));
vi.mock("../../lib/supabase", () => ({ supabase }));
vi.mock("../PrizesManager", () => ({
  PrizesManager: () => <div>Local library content</div>,
}));

import { RewardLibrary } from "./RewardLibrary";

const props = {
  prizes: [],
  onAddPrize: async () => {},
  onUpdatePrize: async () => {},
  onDeletePrize: async () => {},
};

describe("RewardLibrary", () => {
  it("opens on the local library, unchanged", () => {
    render(<RewardLibrary {...props} />);
    expect(screen.getByText("Local library content")).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Local Library", selected: true }),
    ).toBeTruthy();
    expect(screen.queryByText("Coming soon")).toBeNull();
  });

  it("shows the partners as Coming soon, with nothing to click and no network call", () => {
    render(<RewardLibrary {...props} />);
    fireEvent.click(screen.getByRole("tab", { name: "Partner Library" }));

    expect(screen.getByText("Chargily")).toBeTruthy();
    expect(screen.getByText("Gifty")).toBeTruthy();
    expect(screen.getAllByText("Coming soon")).toHaveLength(2);
    expect(screen.queryByText("Local library content")).toBeNull();
    // The cards are not clickable (the two tabs have the tab role).
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("goes back to the local library", () => {
    render(<RewardLibrary {...props} />);
    fireEvent.click(screen.getByRole("tab", { name: "Partner Library" }));
    fireEvent.click(screen.getByRole("tab", { name: "Local Library" }));
    expect(screen.getByText("Local library content")).toBeTruthy();
  });
});
