import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CampaignLinkBar, CampaignQrCode } from "./CampaignLinkShare";
import { CampaignPublishedDialog } from "./CampaignPublishedDialog";

const LINK = `${window.location.protocol}//127.0.0.1${window.location.port ? `:${window.location.port}` : ""}/play/abc123`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CampaignLinkBar", () => {
  it("shows the link with an IP address, never localhost, and copies that one", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CampaignLinkBar slug="abc123" qrTitle="Ramadan" />);
    expect(screen.getByText(LINK)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open live page" }).getAttribute("href"),
    ).toBe(LINK);

    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("opens the QR code in a pop-up from its round button, and closes it", async () => {
    const user = userEvent.setup();
    render(<CampaignLinkBar slug="abc123" qrTitle="Ramadan" />);
    expect(screen.queryByRole("img", { name: /QR code/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Show QR code" }));
    const dialog = screen.getByRole("dialog", { name: "QR code" });
    expect(within(dialog).getByText("Ramadan")).toBeTruthy();
    expect(within(dialog).getByRole("img", { name: /QR code/ })).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has no QR button where the code is already shown", () => {
    render(<CampaignLinkBar slug="abc123" />);
    expect(screen.queryByRole("button", { name: "Show QR code" })).toBeNull();
  });
});

describe("CampaignQrCode", () => {
  it("shares the link on WhatsApp and Facebook, with a download beside them", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<CampaignQrCode name="Ramadan" slug="abc123" />);
    expect(
      screen.getByRole("button", { name: "Download QR code" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Share on WhatsApp" }));
    expect(open.mock.calls[0][0]).toContain("https://wa.me/?text=");
    expect(open.mock.calls[0][0]).toContain(encodeURIComponent(LINK));

    await user.click(screen.getByRole("button", { name: "Share on Facebook" }));
    expect(open.mock.calls[1][0]).toContain(
      `facebook.com/sharer/sharer.php?u=${encodeURIComponent(LINK)}`,
    );
  });
});

describe("CampaignPublishedDialog", () => {
  const campaign = {
    name: "Ramadan",
    slug: "abc123",
    startDate: "2000-01-01T00:00",
  };

  it("says the campaign is live, with its link and QR code, and closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CampaignPublishedDialog campaign={campaign} onClose={onClose} />);
    expect(
      screen.getByRole("dialog", { name: "Your campaign is live" }),
    ).toBeTruthy();
    expect(screen.getByText(LINK)).toBeTruthy();
    expect(screen.getByRole("img", { name: /QR code/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show QR code" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("says it is scheduled when it starts later", () => {
    render(
      <CampaignPublishedDialog
        campaign={{ ...campaign, startDate: "2999-01-01T00:00" }}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: "Your campaign is scheduled" }),
    ).toBeTruthy();
  });
});
