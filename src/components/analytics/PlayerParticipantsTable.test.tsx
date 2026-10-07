import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import type { PlayerParticipantEntry } from "../../hooks/useAnalytics";
import { PlayerParticipantsTable } from "./PlayerParticipantsTable";
import {
  filterPlayers,
  NO_PLAYER_FILTERS,
  toPlayerExportRows,
  type PlayerFilters,
} from "./playerParticipantRows";

const PLAYERS: PlayerParticipantEntry[] = Array.from(
  { length: 25 },
  (_, index) => ({
    id: `p${index + 1}`,
    campaign_id: index % 2 === 0 ? "c1" : "c2",
    campaign_name: index % 2 === 0 ? "Summer" : "Winter",
    phone_number: `0550${String(index + 1).padStart(6, "0")}`,
    participant_name: `Player ${String(index + 1).padStart(2, "0")}`,
    is_winner: index < 3,
    prize_name: index < 3 ? "Headphones" : null,
    quiz_passed: null,
    coupon_confirmed: null,
    redeemed_coupon_value: null,
    dwell_time_seconds: 30 + index,
    created_at: "2026-10-01T10:00:00Z",
  }),
);

function Harness({ showCampaign = true }: { showCampaign?: boolean }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlayerFilters>(NO_PLAYER_FILTERS);
  return (
    <PlayerParticipantsTable
      players={PLAYERS}
      shownCount={filterPlayers(PLAYERS, query, filters).length}
      showCampaign={showCampaign}
      query={query}
      onQueryChange={setQuery}
      filters={filters}
      onFiltersChange={setFilters}
    />
  );
}

const bodyRows = () =>
  within(screen.getByRole("table", { name: "Player participants" }))
    .getAllByRole("row")
    .filter((row) => row.closest("tbody"));

describe("PlayerParticipantsTable", () => {
  it("shows 10 players per page with Previous, page numbers and Next", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Previous" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByText("Rows 21–25 of 25")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Page 3" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("searches the players", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Search players…"), "player 07");
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("1 of 25 players")).toBeTruthy();
  });

  it("filters the players from the Filter button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: /Filter/ }));
    await user.click(screen.getByRole("button", { name: "Winners" }));
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByText("3 of 25 players")).toBeTruthy();
  });

  it("only names the campaign when all campaigns are shown together", () => {
    const { unmount } = render(<Harness />);
    expect(
      screen.queryByRole("columnheader", { name: /Campaign/ }),
    ).toBeTruthy();
    unmount();
    render(<Harness showCampaign={false} />);
    expect(screen.queryByRole("columnheader", { name: /Campaign/ })).toBeNull();
  });
});

describe("toPlayerExportRows", () => {
  it("exports every filtered row, with the campaign only in the combined view", () => {
    const winners = filterPlayers(PLAYERS, "", {
      result: "winner",
      quiz: "all",
    });
    const rows = toPlayerExportRows(winners, true);
    expect(rows).toHaveLength(3);
    expect(rows[0].Campaign).toBe("Summer");
    expect(toPlayerExportRows(PLAYERS, false)[0]).not.toHaveProperty(
      "Campaign",
    );
  });
});
