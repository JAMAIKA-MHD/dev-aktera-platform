import { describe, expect, it } from "vitest";
import { createDefaultExperience } from "./defaults";
import { parsePublicExperience } from "./publicCampaign";

// The answer of get_public_experience (backend tasks B1.2, B5.2).
const answer = (patch: Record<string, unknown> = {}) => ({
  found: true,
  campaign: {
    id: "c-1",
    slug: "zeta-wheel",
    name: "Zeta Wheel",
    game_type: "lucky_wheel",
    status: "active",
    rules: {
      pass_threshold_percentage: null,
      quiz_seconds_per_question: null,
      win_threshold: null,
      hit_it_duration_seconds: null,
    },
  },
  prizes: [{ id: "p-1", name: "Bon 1000 DA", win_message: "Bravo !" }],
  quiz: [],
  availability: { open: true },
  experience: null,
  ...patch,
});

const ok = (raw: unknown) => {
  const result = parsePublicExperience(raw);
  if (result.status !== "ok") throw new Error("expected a campaign");
  return result;
};

describe("parsePublicExperience", () => {
  it("returns not_found for an unknown or unpublished slug", () => {
    expect(parsePublicExperience({ found: false })).toEqual({
      status: "not_found",
    });
  });

  it("builds the campaign the runtime reads", () => {
    const result = ok(answer());
    expect(result.slug).toBe("zeta-wheel");
    expect(result.availability).toEqual({ open: true });
    expect(result.campaign).toEqual({
      id: "c-1",
      name: "Zeta Wheel",
      gameType: "lucky_wheel",
      status: "active",
      prizes: [{ id: "p-1", name: "Bon 1000 DA", winMessage: "Bravo !" }],
      quiz: [],
      rules: {},
    });
  });

  it("uses the campaign's default design when the Studio was never opened", () => {
    const result = ok(answer());
    expect(result.config.campaignId).toBe("c-1");
    expect(result.config.game.type).toBe("lucky_wheel");
    expect(
      result.config.game.wheel?.segments.some(
        (segment) => segment.prizeId === "p-1",
      ),
    ).toBe(true);
    expect(result.configIssues).toEqual([]);
  });

  it("uses the stored design, and repairs a damaged one", () => {
    const design = createDefaultExperience({ gameType: "lucky_wheel" });
    const stored = { ...design, brand: { ...design.brand, name: "Zeta" } };
    expect(ok(answer({ experience: stored })).config.brand.name).toBe("Zeta");

    const damaged = ok(answer({ experience: { ...stored, theme: "broken" } }));
    expect(damaged.config.theme).toEqual(design.theme);
    expect(damaged.configIssues.length).toBeGreaterThan(0);
  });

  it("replaces the game settings of a design made for another game", () => {
    const quizDesign = createDefaultExperience({ gameType: "quiz" });
    const result = ok(answer({ experience: quizDesign }));
    expect(result.config.game.type).toBe("lucky_wheel");
    expect(
      result.configIssues.some((issue) => issue.startsWith("game.type")),
    ).toBe(true);
  });

  it("gives the new game its own screen texts, and keeps a brand's own wording", () => {
    const wheelDesign = createDefaultExperience({ gameType: "lucky_wheel" });
    const hitIt = (experience: unknown) =>
      ok(
        answer({
          campaign: { ...answer().campaign, game_type: "hit_it" },
          experience,
        }),
      ).config.screens;
    // Still the wheel's defaults: the Hit It ones instead.
    expect(hitIt(wheelDesign).play.title.fr).toBe("Touchez la cible !");
    expect(hitIt(wheelDesign).play.reinforcement.kind).toBe("timer");
    expect(hitIt(wheelDesign).welcome.title.fr).not.toMatch(/roue/i);
    // Written by the brand: kept.
    const written = structuredClone(wheelDesign);
    written.screens.play.title = { fr: "À vous !" };
    expect(hitIt(written).play.title).toEqual({ fr: "À vous !" });
    expect(hitIt(written).play.subtitle.fr).toBe(
      "Chaque touche compte, le temps file.",
    );
  });

  it("names the brand after the organization when the design has no name", () => {
    const withOrganizer = (experience: unknown) =>
      ok(
        answer({
          campaign: {
            ...answer().campaign,
            organization_name: " Zeta Market ",
          },
          experience,
        }),
      ).config;
    expect(withOrganizer(null).brand.name).toBe("Zeta Market");
    expect(withOrganizer(null).legal.organizerName).toBe("Zeta Market");
    const unnamed = createDefaultExperience({ gameType: "lucky_wheel" });
    expect(withOrganizer(unnamed).brand.name).toBe("Zeta Market");
    const named = { ...unnamed, brand: { ...unnamed.brand, name: "Zeta" } };
    expect(withOrganizer(named).brand.name).toBe("Zeta");
    // Before the migration the field is absent: nothing changes.
    expect(ok(answer()).config.brand.name).toBe("");
  });

  it("reads the public rules like the dashboard (numbers or numeric strings)", () => {
    const hitIt = ok(
      answer({
        campaign: {
          ...answer().campaign,
          game_type: "hit_it",
          rules: { win_threshold: "8", hit_it_duration_seconds: 12 },
        },
      }),
    );
    expect(hitIt.campaign.rules).toEqual({
      hitIt: { winThreshold: 8, durationSeconds: 12 },
    });
  });

  it("maps the quiz questions, in the order received", () => {
    const quiz = ok(
      answer({
        campaign: { ...answer().campaign, game_type: "quiz" },
        quiz: [{ id: "q-1", question: "Capital?", options: ["Oran", "Alger"] }],
      }),
    );
    expect(quiz.campaign.quiz).toEqual([
      { id: "q-1", text: "Capital?", options: ["Oran", "Alger"] },
    ]);
  });

  it("treats an ended campaign as archived and keeps its availability", () => {
    const ended = ok(
      answer({
        campaign: { ...answer().campaign, status: "ended" },
        availability: { open: false, reason: "CLOSED" },
      }),
    );
    expect(ended.campaign.status).toBe("archived");
    expect(ended.availability).toEqual({ open: false, reason: "CLOSED" });
  });

  it("throws on an answer of an unexpected shape", () => {
    expect(() => parsePublicExperience(null)).toThrow(
      "Unexpected public campaign answer",
    );
    expect(() =>
      parsePublicExperience(
        answer({ campaign: { ...answer().campaign, game_type: "memory" } }),
      ),
    ).toThrow("campaign.game_type");
  });
});
