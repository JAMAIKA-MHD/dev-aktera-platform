import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "../../contexts/ThemeContext";
import { AlgeriaWilayaMap } from "./AlgeriaWilayaMap";

const LOCATIONS = [
  { location: "16 - Alger", count: 21 },
  { location: "Constantine", count: 20 },
  { location: "Oran", count: 18 },
  { location: "Blida", count: 4 },
  { location: "Atlantis", count: 2 },
];

function renderMap() {
  return render(
    <ThemeProvider>
      <AlgeriaWilayaMap locations={LOCATIONS} unknownCount={25} />
    </ThemeProvider>,
  );
}

describe("AlgeriaWilayaMap", () => {
  it("shows the top three wilayas and what is off the map", () => {
    renderMap();
    const top = screen.getByRole("list");
    expect(within(top).getAllByRole("listitem")).toHaveLength(3);
    expect(within(top).getByText("Alger")).toBeTruthy();
    expect(within(top).queryByText("Blida")).toBeNull();
    expect(
      screen.getByText(/25 without location data · 2 in a location/),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /View all 4 wilayas/ }),
    ).toBeTruthy();
  });

  it("opens the full map, filters, selects and closes on Escape", async () => {
    const user = userEvent.setup();
    renderMap();
    const opener = screen.getByRole("button", { name: /View all 4 wilayas/ });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", {
      name: "Segmentation by wilaya",
    });
    expect(within(dialog).getByText(/rank 1 of 4/)).toBeTruthy();

    await user.type(
      within(dialog).getByRole("searchbox", { name: "Search wilayas" }),
      "blida",
    );
    await user.click(within(dialog).getByRole("button", { name: /Blida/ }));
    expect(within(dialog).getByText(/rank 4 of 4/)).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("zooms the full map in and back to the starting view", async () => {
    const user = userEvent.setup();
    renderMap();
    await user.click(screen.getByRole("button", { name: "Open map" }));
    const dialog = screen.getByRole("dialog");
    const zoomIn = within(dialog).getByRole("button", { name: "Zoom in" });
    const zoomOut = within(dialog).getByRole("button", { name: "Zoom out" });
    const reset = within(dialog).getByRole("button", { name: "Reset zoom" });
    expect((zoomOut as HTMLButtonElement).disabled).toBe(true);

    await user.click(zoomIn);
    await user.click(zoomIn);
    expect((zoomOut as HTMLButtonElement).disabled).toBe(false);

    await user.click(reset);
    expect((reset as HTMLButtonElement).disabled).toBe(true);
  });
});
