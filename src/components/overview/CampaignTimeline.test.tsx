import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PATHS } from "../../dashboard/paths";
import type { Campaign } from "../../types";
import { CampaignTimeline } from "./CampaignTimeline";
import {
  addDays,
  extendedTimelineScale,
  isoDate,
  startOfDay,
  timelineScales,
} from "./overviewData";

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

describe("CampaignTimeline, many campaigns", () => {
  const many = Array.from({ length: 8 }, (_, i) => ({
    ...CAMPAIGN,
    id: `c${i + 1}`,
    name: `Campaign ${i + 1}`,
    slug: `campaign-${i + 1}`,
  }));
  const renderMany = () =>
    render(
      <MemoryRouter>
        <CampaignTimeline campaigns={many} prizes={[]} />
      </MemoryRouter>,
    );

  it("shows a brief in the card, and every campaign in the full timeline", () => {
    renderMany();
    const card = screen.getByRole("region", { name: "Campaign timeline" });
    expect(card.querySelectorAll(".ov-bar")).toHaveLength(4);
    // "See more" sits right under the last name shown.
    const names = card.querySelector(".ov-tl-labels");
    expect(names?.lastElementChild?.textContent).toBe("See more+4");

    fireEvent.click(screen.getByRole("button", { name: /^See more/ }));
    const full = screen.getByRole("dialog", { name: "Full campaign timeline" });
    expect(full.querySelectorAll(".ov-bar")).toHaveLength(8);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the full timeline from the button at the top of the card", () => {
    renderMany();
    fireEvent.click(
      screen.getByRole("button", { name: "Open the full timeline" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Full campaign timeline" }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Close the full timeline" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("no longer writes the status beside the bars", () => {
    renderMany();
    expect(document.querySelector(".ov-bar-label")).toBeNull();
  });
});

describe("extendedTimelineScale", () => {
  const now = new Date(2026, 10, 4, 12).getTime(); // a Wednesday
  const base = timelineScales(now);
  const day = (y: number, m: number, d: number) => new Date(y, m, d).getTime();

  it("is the usual view when every campaign fits in it", () => {
    const range = extendedTimelineScale("weeks", base.weeks, []);
    expect(range.start).toBe(base.weeks.start);
    expect(range.days).toBe(base.weeks.days);
  });

  it("reaches back to the earliest start and four weeks past the latest end", () => {
    const campaigns = [
      { start: day(2026, 9, 1), end: day(2026, 10, 20) },
      { start: day(2026, 11, 1), end: day(2027, 2, 31) },
    ];
    const range = extendedTimelineScale("weeks", base.weeks, campaigns);
    expect(range.start).toBeLessThanOrEqual(day(2026, 9, 1));
    expect(new Date(range.start).getDay()).toBe(1); // a Monday
    const end = range.start + range.days * 86_400_000;
    expect(end).toBeGreaterThanOrEqual(addDays(day(2027, 2, 31), 28));
    expect(range.ticks).toHaveLength(range.days / 7);

    const months = extendedTimelineScale("months", base.months, campaigns);
    expect(months.ticks[0].label).toBe("Oct 2026");
    expect(months.ticks.at(-1)?.label).toBe("Apr");
  });
});

describe("CampaignTimeline, the full timeline", () => {
  it("is wide enough to scroll to the end of a long campaign", () => {
    const long = {
      ...CAMPAIGN,
      endDate: isoDate(addDays(today, 200)),
    };
    render(
      <MemoryRouter>
        <CampaignTimeline campaigns={[long]} prizes={[]} />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Open the full timeline" }),
    );
    const chart = screen
      .getByRole("dialog")
      .querySelector<HTMLElement>(".ov-tl-chart");
    // 18 px a day, from this week to four weeks past the end.
    expect(parseInt(chart?.style.minWidth ?? "0", 10)).toBeGreaterThan(
      228 * 18 - 7 * 18,
    );
    expect(screen.getByRole("button", { name: "Today" })).toBeTruthy();
  });
});
