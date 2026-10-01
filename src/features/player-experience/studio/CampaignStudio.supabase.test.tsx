import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Campaign } from "@/src/types";
import { createDefaultExperience } from "../domain/defaults";
import {
  createFakeSupabase,
  type FakeHandlers,
} from "../services/supabase/__tests__/fakeSupabaseClient";
import { CampaignSimulator } from "./CampaignSimulator";
import { CampaignStudio } from "./CampaignStudio";

// The Studio and the sandbox on Supabase (backend task B4.1): a real campaign's design is read
// from campaign_experiences; nothing can be edited while it cannot be read.

const ORG = "00000000-0000-0000-0000-000000000001";

const campaign = (patch: Partial<Campaign> = {}): Campaign => ({
  id: "c-wheel",
  organizationId: ORG,
  name: "Rentrée Zeta",
  arabicName: "",
  slug: "rentree-zeta",
  gameType: "lucky_wheel",
  status: "active",
  winProbability: 65,
  maxEntries: "1",
  prizes: [
    { id: "p1", templateId: "t1", quantity: 30, quantity_won: 8, weight: 60 },
  ],
  questions: [],
  participantsCount: 0,
  rewardsClaimed: 0,
  startDate: "2026-09-01",
  endDate: "2026-10-01",
  ...patch,
});
const templates = [{ id: "t1", name: "Bon 2000 DA" }];

const settle = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

function renderStudio(handlers: FakeHandlers, patch: Partial<Campaign> = {}) {
  const fake = createFakeSupabase(handlers);
  render(
    <CampaignStudio
      campaigns={[campaign(patch)]}
      prizeTemplates={templates}
      campaignId="c-wheel"
      backend={{ client: fake.client, supabaseUrl: "http://127.0.0.1:54321" }}
    />,
  );
  return fake;
}

describe("CampaignStudio on Supabase", () => {
  beforeEach(() => localStorage.clear());

  it("reads the campaign's design from campaign_experiences", async () => {
    const saved = {
      ...createDefaultExperience({ gameType: "lucky_wheel" }),
      campaignId: "c-wheel",
      brand: {
        ...createDefaultExperience({ gameType: "lucky_wheel" }).brand,
        name: "Zeta Server",
      },
    };
    const { calls } = renderStudio({
      select: () => ({ data: { config: saved } }),
    });
    await settle();
    expect(calls).toContainEqual({
      kind: "select",
      target: "campaign_experiences",
      payload: [["campaign_id", "c-wheel"]],
    });
    fireEvent.click(screen.getByRole("button", { name: /Brand/ }));
    expect(screen.getByDisplayValue("Zeta Server")).toBeTruthy();
  });

  it("stays in the browser for a campaign without organization", async () => {
    const { calls } = renderStudio({}, { organizationId: undefined });
    await settle();
    expect(calls).toEqual([]);
  });

  it("blocks editing while the saved design cannot be read, then retries", async () => {
    let attempts = 0;
    renderStudio({
      select: () => {
        attempts += 1;
        return attempts === 1
          ? { error: { message: "network down" } }
          : { data: null };
      },
    });
    await settle();
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not load the saved design.",
    );
    expect(screen.queryByRole("button", { name: /Brand/ })).toBeTruthy(); // the menu stays
    expect(screen.queryByLabelText("Live preview")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await settle();
    expect(attempts).toBe(2);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByLabelText("Live preview")).toBeTruthy();
  });
});

describe("CampaignSimulator on Supabase", () => {
  it("says so when the saved design cannot be read, and retries", async () => {
    let attempts = 0;
    const fake = createFakeSupabase({
      select: () => {
        attempts += 1;
        return attempts === 1
          ? { error: { message: "network down" } }
          : { data: null };
      },
    });
    render(
      <CampaignSimulator
        campaigns={[campaign()]}
        prizeTemplates={templates}
        campaignId="c-wheel"
        backend={{ client: fake.client, supabaseUrl: "http://127.0.0.1:54321" }}
      />,
    );
    await settle();
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not load the saved design.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await settle();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      fake.calls.filter((call) => call.target === "campaign_experiences"),
    ).toHaveLength(2);
  });
});
