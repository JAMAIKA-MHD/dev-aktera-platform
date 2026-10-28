import { z } from "zod";
import {
  rulesFromGameLogic,
  type CampaignSnapshot,
  type CampaignStatus,
} from "./campaign";
import { createDefaultExperience, screensForGame } from "./defaults";
import type { GameType } from "./gameTypes";
import type { Availability } from "./participation";
import { parseExperienceConfig } from "./schema";
import type { ExperienceConfig } from "./types";

// What the public player page gets from get_public_experience (backend tasks B1.2, B5.2),
// validated and turned into what the runtime reads. Pure: no network, no Supabase.

export type PublicExperience =
  | { status: "not_found" }
  | {
      status: "ok";
      slug: string;
      campaign: CampaignSnapshot;
      availability: Availability;
      config: ExperienceConfig;
      configIssues: string[]; // what had to be repaired in the stored design
    };

const GAME_TYPES = [
  "lucky_wheel",
  "quiz",
  "scratch_card",
  "mystery_box",
  "hit_it",
] as const satisfies readonly GameType[];

const publicExperienceSchema = z.object({
  found: z.literal(true),
  campaign: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    name: z.string(),
    game_type: z.enum(GAME_TYPES),
    status: z.string(),
    rules: z.unknown().optional(),
    // Absent before migration 20261028120000: the page then keeps the design's own name.
    organization_name: z.string().nullish(),
  }),
  prizes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string(),
      win_message: z.string().nullable(),
    }),
  ),
  quiz: z.array(
    z.object({
      id: z.string().min(1),
      question: z.string(),
      options: z.array(z.string()),
    }),
  ),
  availability: z.union([
    z.object({ open: z.literal(true) }),
    z.object({
      open: z.literal(false),
      reason: z.enum(["CLOSED", "SOLD_OUT"]),
    }),
  ]),
  experience: z.unknown().optional(),
});

// The database knows "ended" too: for the player it is simply over.
function toStatus(status: string): CampaignStatus {
  if (status === "active" || status === "paused" || status === "draft") {
    return status;
  }
  return "archived";
}

// Throws on an answer of an unexpected shape: the page then shows a technical error.
export function parsePublicExperience(raw: unknown): PublicExperience {
  if (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { found?: unknown }).found === false
  ) {
    return { status: "not_found" };
  }
  const parsed = publicExperienceSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Unexpected public campaign answer: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  const data = parsed.data;
  const gameType = data.campaign.game_type;
  const campaign: CampaignSnapshot = {
    id: data.campaign.id,
    name: data.campaign.name,
    gameType,
    status: toStatus(data.campaign.status),
    prizes: data.prizes.map((prize) => ({
      id: prize.id,
      name: prize.name,
      winMessage: prize.win_message,
    })),
    quiz: data.quiz.map((question) => ({
      id: question.id,
      text: question.question,
      options: [...question.options],
    })),
    rules: rulesFromGameLogic(gameType, data.campaign.rules),
  };

  // No design yet (the Studio was never opened): the default experience of the campaign,
  // under the organizer's name.
  const organizer = data.campaign.organization_name?.trim() ?? "";
  const defaults = () =>
    createDefaultExperience({
      gameType,
      campaign,
      brandName: organizer || undefined,
    });
  let config: ExperienceConfig;
  let configIssues: string[] = [];
  if (data.experience === null || data.experience === undefined) {
    config = defaults();
  } else {
    const stored = parseExperienceConfig(data.experience, gameType);
    config = { ...stored.config, campaignId: campaign.id };
    configIssues = stored.issues;
    // The game was changed in the Wizard after the design was made: its presentation no
    // longer fits, the campaign's default one is used (the Studio flags the same mismatch).
    if (config.game.type !== gameType) {
      config = {
        ...config,
        game: defaults().game,
        screens: screensForGame(config.screens, config.game.type, gameType),
      };
      configIssues = [
        ...configIssues,
        `game.type: "${stored.config.game.type}" does not match the campaign's "${gameType}", default game settings used`,
      ];
    }
    // A design saved without a brand name (or an organizer): the organization's, never an
    // empty header capsule.
    if (organizer && !config.brand.name.trim()) {
      config = { ...config, brand: { ...config.brand, name: organizer } };
    }
    if (organizer && !config.legal.organizerName.trim()) {
      config = {
        ...config,
        legal: { ...config.legal, organizerName: organizer },
      };
    }
  }

  return {
    status: "ok",
    slug: data.campaign.slug,
    campaign,
    availability: data.availability,
    config,
    configIssues,
  };
}
