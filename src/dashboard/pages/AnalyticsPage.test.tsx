import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATHS } from "../paths";
import AnalyticsPage from "./AnalyticsPage";

const dashboard = vi.hoisted(() => ({
  value: {
    campaigns: [] as { id: string }[],
    leads: [] as { id: string }[],
    leadsLoading: false,
    leadsError: null as string | null,
  },
}));

vi.mock("../DashboardContext", () => ({
  useDashboard: () => dashboard.value,
}));
vi.mock("../../components/AnalyticsCenter", () => ({
  AnalyticsCenter: ({ notice }: { notice?: ReactNode }) => (
    <div>
      {notice}
      <p>analytics cards</p>
    </div>
  ),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/analytics/:campaignId" element={<AnalyticsPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("AnalyticsPage", () => {
  beforeEach(() => {
    dashboard.value = {
      campaigns: [{ id: "c1" }],
      leads: [],
      leadsLoading: false,
      leadsError: null,
    };
  });

  it("keeps the cards under the notice, with a text link to the campaigns", () => {
    renderAt("/analytics");
    expect(screen.getByText("No data to analyze yet")).toBeTruthy();
    expect(screen.getByText("analytics cards")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Want to preview your campaigns?" })
        .getAttribute("href"),
    ).toBe(PATHS.campaigns);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers to create a campaign when there is none", () => {
    dashboard.value.campaigns = [];
    renderAt("/analytics");
    expect(
      screen
        .getByRole("link", { name: "Want to create your first campaign?" })
        .getAttribute("href"),
    ).toBe(PATHS.create);
  });

  it("leaves the notice out once there is a participant, on error, and on one campaign", () => {
    dashboard.value.leads = [{ id: "l1" }];
    const { unmount } = renderAt("/analytics");
    expect(screen.queryByText("No data to analyze yet")).toBeNull();
    unmount();

    dashboard.value.leads = [];
    dashboard.value.leadsError = "failed";
    const failed = renderAt("/analytics");
    expect(screen.queryByText("No data to analyze yet")).toBeNull();
    failed.unmount();

    dashboard.value.leadsError = null;
    renderAt("/analytics/c1");
    expect(screen.queryByText("No data to analyze yet")).toBeNull();
    expect(screen.getByText("analytics cards")).toBeTruthy();
  });
});
