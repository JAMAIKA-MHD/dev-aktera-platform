import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CampaignLinkShare } from "./CampaignLinkShare";
import { CampaignPublishedDialog } from "./CampaignPublishedDialog";

const LINK = `${window.location.protocol}//127.0.0.1${window.location.port ? `:${window.location.port}` : ""}/play/abc123`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CampaignLinkShare", () => {
  it("shows the link with an IP address, never localhost, and copies that one", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CampaignLinkShare name="Ramadan" slug="abc123" />);
    expect(screen.getByText(LINK)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open live page" }).getAttribute("href"),
    ).toBe(LINK);

    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("keeps the QR code's actions behind its menu", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<CampaignLinkShare name="Ramadan" slug="abc123" />);
    expect(screen.getByRole("img", { name: /QR code/ })).toBeTruthy();
    expect(screen.queryByRole("menu")).toBeNull();

    const menu = screen.getByRole("button", { name: "QR code actions" });
    await user.click(menu);
    expect(
      screen.getByRole("menuitem", { name: "Download QR code" }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("menuitem", { name: "Share on WhatsApp" }),
    );
    expect(open.mock.calls[0][0]).toContain("https://wa.me/?text=");
    expect(open.mock.calls[0][0]).toContain(encodeURIComponent(LINK));

    await user.click(menu);
    await user.click(
      screen.getByRole("menuitem", { name: "Share on Facebook" }),
    );
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

  it("says the campaign is live, with its link, and closes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CampaignPublishedDialog campaign={campaign} onClose={onClose} />);
    expect(
      screen.getByRole("dialog", { name: "Your campaign is live" }),
    ).toBeTruthy();
    expect(screen.getByText(LINK)).toBeTruthy();
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

  it("lets Escape close the open menu first, then the window", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CampaignPublishedDialog campaign={campaign} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "QR code actions" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
