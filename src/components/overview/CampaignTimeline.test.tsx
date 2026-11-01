import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PATHS } from "../../dashboard/paths";
import type { Campaign } from "../../types";
import { CampaignTimeline } from "./CampaignTimeline";
import { addDays, isoDate, startOfDay } from "./overviewData";

const today = startOfDay(Date.now());

const CAMPAIGN: Campaign = {
  id: "c1",
  name: "Eid Wheel",
  arabicName: "",
  slug: "eid-wheel",
  gameType: "lucky_wheel",
  status: "active",
  winProbability: 50,
  prizes: [],
  questions: [],
  participantsCount: 0,
  rewardsClaimed: 0,
  startDate: isoDate(addDays(today, -3)),
  endDate: isoDate(addDays(today, 10)),
};

function CreatePage() {
  const { state } = useLocation();
  return <p>wizard:{state?.startDate}</p>;
}

function setup() {
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={<CampaignTimeline campaigns={[CAMPAIGN]} prizes={[]} />}
        />
        <Route path={PATHS.create} element={<CreatePage />} />
      </Routes>
    </MemoryRouter>,
  );
  // A press without a position picks today.
  fireEvent.click(
    screen.getByRole("button", { name: "Pick a date on the timeline" }),
  );
}

describe("isoDate", () => {
  it("names the local day, whatever the time zone", () => {
    expect(isoDate(new Date(2026, 10, 14).getTime())).toBe("2026-11-14");
    expect(isoDate(new Date(2026, 0, 1).getTime())).toBe("2026-01-01");
  });
});

describe("CampaignTimeline", () => {
  it("opens the campaign window on the selected date", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    fireEvent.click(
      screen.getByRole("link", { name: "Create campaign on this date" }),
    );
    expect(
      screen.getByText(`wizard:${isoDate(addDays(today, 1))}`),
    ).toBeTruthy();
  });

  it("offers today, but not a day that has passed", () => {
    setup();
    expect(
      screen.getByRole("link", { name: "Create campaign on this date" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(
      screen.queryByRole("link", { name: "Create campaign on this date" }),
    ).toBeNull();
    expect(screen.getByText(/This day has passed/)).toBeTruthy();
  });
});
