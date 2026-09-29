import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicExperience } from "../../features/player-experience";

// The public player page (backend task B5.2), with the campaign loader mocked: loading, not
// found, error with retry, and the runtime on the live gateway.

const load = vi.hoisted(() =>
  vi.fn<(client: unknown, slug: string) => Promise<PublicExperience>>(),
);

vi.mock("../../lib/supabase", () => ({
  supabase: { rpc: vi.fn(), functions: { invoke: vi.fn() } },
}));
vi.mock("../../features/player-experience", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../../features/player-experience")
  >()),
  loadPublicExperience: load,
}));

import PublicPlayPage from "./PublicPlayPage";

// A real campaign, read by the module's own loader from a fake get_public_experience answer.
const campaignAnswer = async (): Promise<PublicExperience> => {
  const actual = await vi.importActual<
    typeof import("../../features/player-experience")
  >("../../features/player-experience");
  const data = {
    found: true,
    campaign: {
      id: "c-1",
      slug: "zeta",
      name: "Zeta Wheel",
      game_type: "lucky_wheel",
      status: "active",
      rules: {},
    },
    prizes: [{ id: "p-1", name: "Bon 1000 DA", win_message: null }],
    quiz: [],
    availability: { open: true },
    experience: null,
  };
  const client = { rpc: async () => ({ data, error: null }) };
  return actual.loadPublicExperience(client as never, "zeta");
};

function renderPage(slug = "zeta") {
  return render(
    <MemoryRouter initialEntries={[`/play/${slug}`]}>
      <Routes>
        <Route path="/play/:slug" element={<PublicPlayPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const settle = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

describe("PublicPlayPage", () => {
  beforeEach(() => load.mockReset());

  it("loads the campaign of the slug, then plays it on the live gateway", async () => {
    load.mockReturnValue(campaignAnswer());
    const { container } = renderPage("zeta");
    expect(screen.getByRole("status")).toBeTruthy();
    await waitFor(() =>
      expect(container.querySelector(".xp-runtime")).toBeTruthy(),
    );
    expect(load).toHaveBeenCalledWith(expect.anything(), "zeta");
    // No demo badge: the live gateway is used, and accepted.
    expect(screen.queryByText("Demo")).toBeNull();
    expect(document.title).toBe("Zeta Wheel");
  });

  it("says so, in three languages, when the campaign does not exist", async () => {
    load.mockResolvedValue({ status: "not_found" });
    renderPage();
    await settle();
    expect(screen.getByText("Campaign not found")).toBeTruthy();
    expect(screen.getByText("Campagne introuvable")).toBeTruthy();
    expect(screen.getByText("الحملة غير موجودة")).toBeTruthy();
  });

  it("offers to retry when the campaign cannot be loaded", async () => {
    load
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce({ status: "not_found" });
    renderPage();
    await settle();
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Campaign not found")).toBeTruthy();
  });
});
