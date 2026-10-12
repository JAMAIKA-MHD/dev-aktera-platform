import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PhysicalWinner } from "../../types";

const service = vi.hoisted(() => ({
  fetchPhysicalWinners: vi.fn(),
  setDeliveryStatus: vi.fn(),
}));
vi.mock("../../services/deliveryService", () => service);

import { PhysicalDeliveryPanel } from "./PhysicalDeliveryPanel";

const winner = (over: Partial<PhysicalWinner> = {}): PhysicalWinner => ({
  entryId: "e1",
  phoneNumber: "0551111111",
  participantName: "Ali",
  prizeName: "Phone case",
  wonAt: "2026-10-12T10:00:00Z",
  deliveryStatus: "not_delivered",
  deliveredAt: null,
  ...over,
});

const renderPanel = (canEdit = true) =>
  render(
    <PhysicalDeliveryPanel
      organizationId="org1"
      templateId="t1"
      canEdit={canEdit}
    />,
  );

beforeEach(() => {
  service.fetchPhysicalWinners.mockReset();
  service.setDeliveryStatus.mockReset();
  service.fetchPhysicalWinners.mockResolvedValue([winner()]);
  service.setDeliveryStatus.mockResolvedValue(undefined);
});

describe("PhysicalDeliveryPanel", () => {
  it("lists the winners of the reward with their status", async () => {
    renderPanel();
    expect(await screen.findByText("Ali")).toBeTruthy();
    expect(service.fetchPhysicalWinners).toHaveBeenCalledWith("org1", "t1");
    expect(
      (screen.getByLabelText("Delivery status of Ali") as HTMLSelectElement)
        .value,
    ).toBe("not_delivered");
  });

  it("says plainly that the brand delivers and AKTERA only records", async () => {
    renderPanel();
    await screen.findByText("Ali");
    expect(
      screen.getByText("You handle delivery. AKTERA only records the status."),
    ).toBeTruthy();
  });

  it("records a delivery and keeps it", async () => {
    renderPanel();
    const select = (await screen.findByLabelText(
      "Delivery status of Ali",
    )) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "delivered" } });
    await waitFor(() =>
      expect(service.setDeliveryStatus).toHaveBeenCalledWith("e1", "delivered"),
    );
    await waitFor(() => expect(select.value).toBe("delivered"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("goes back to the previous status and says why when the server refuses", async () => {
    service.setDeliveryStatus.mockRejectedValue(
      new Error("You are not allowed to update this delivery status."),
    );
    renderPanel();
    const select = (await screen.findByLabelText(
      "Delivery status of Ali",
    )) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "delivered" } });
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "You are not allowed to update this delivery status.",
    );
    await waitFor(() => expect(select.value).toBe("not_delivered"));
  });

  it("is read-only for a viewer", async () => {
    service.fetchPhysicalWinners.mockResolvedValue([
      winner({ deliveryStatus: "delivered" }),
    ]);
    renderPanel(false);
    await screen.findByText("Ali");
    expect(screen.queryByLabelText("Delivery status of Ali")).toBeNull();
    expect(screen.getByText("Delivered")).toBeTruthy();
  });

  it("explains when there is no winner yet", async () => {
    service.fetchPhysicalWinners.mockResolvedValue([]);
    renderPanel();
    expect(
      await screen.findByText("No winners yet for this reward."),
    ).toBeTruthy();
  });

  it("shows an error with a retry when the winners cannot be loaded", async () => {
    service.fetchPhysicalWinners.mockRejectedValueOnce(new Error("boom"));
    renderPanel();
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /could not load the winners/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Ali")).toBeTruthy();
  });

  it("shows a winner without a name by phone number", async () => {
    service.fetchPhysicalWinners.mockResolvedValue([
      winner({ participantName: null }),
    ]);
    renderPanel();
    expect(await screen.findByText("0551111111")).toBeTruthy();
  });

  it("collects no address, carrier or tracking", async () => {
    renderPanel();
    await screen.findByText("Ali");
    expect(screen.queryByText(/address|carrier|tracking|shipping/i)).toBeNull();
  });
});
