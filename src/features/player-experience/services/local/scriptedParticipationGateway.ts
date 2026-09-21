import type { CampaignPrize } from "../../domain/campaign";
import type {
  DrawResult,
  ParticipationErrorCode,
} from "../../domain/participation";
import { createUuid } from "../../domain/uuid";
import type { Availability, ParticipationGateway } from "../ports";
import { createDemoCouponCode, type RandomSource } from "./demoDrawEngine";
import { DEMO_GATEWAY_WARNING } from "./demoParticipationGateway";

// ParticipationGateway that returns the outcome chosen in the Studio, to check every screen
// (win with a given prize, loss, duplicate, closed campaign, network error). No draw, no
// record, no stock: it has no side effect.

export type ScriptedScenario =
  | `win-${string}` // win-<prizeId>
  | "lose"
  | "duplicate"
  | "closed"
  | "network-error";

export const SCRIPTED_LATENCY_MS = 300;

export interface ScriptedParticipationGateway extends ParticipationGateway {
  readonly mode: "scripted";
  readonly scenario: ScriptedScenario;
  setScenario(scenario: ScriptedScenario): void; // the Studio's scenario picker
}

export interface ScriptedParticipationGatewayOptions {
  scenario: ScriptedScenario;
  prizes?: readonly CampaignPrize[]; // to name the prize of a "win-<prizeId>" scenario
  random?: RandomSource; // coupon codes
  sleep?: (ms: number) => Promise<void>;
  warn?: (message: string) => void;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const failure = (
  code: ParticipationErrorCode,
  message: string,
): DrawResult => ({ ok: false, error: { code, message } });

export function createScriptedParticipationGateway(
  options: ScriptedParticipationGatewayOptions,
): ScriptedParticipationGateway {
  let scenario = options.scenario;
  const prizes = options.prizes ?? [];
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? wait;
  const warn = options.warn ?? ((message: string) => console.warn(message));
  let warned = false;

  function outcomeFor(current: ScriptedScenario): DrawResult {
    if (current.startsWith("win-")) {
      const prizeId = current.slice("win-".length);
      const prize = prizes.find((candidate) => candidate.id === prizeId);
      return {
        ok: true,
        entryId: createUuid(),
        outcome: {
          isWinner: true,
          // An unknown prize keeps its id as name: the screen still shows something.
          prize: {
            id: prizeId,
            name: prize?.name || prizeId,
            winMessage: prize?.winMessage ?? null,
          },
          couponCode: createDemoCouponCode(random),
        },
      };
    }
    switch (current) {
      case "lose":
        return {
          ok: true,
          entryId: createUuid(),
          outcome: { isWinner: false, prize: null, couponCode: null },
        };
      case "duplicate":
        return failure(
          "ALREADY_PARTICIPATED",
          "You have already participated in this campaign.",
        );
      case "closed":
        return failure("CAMPAIGN_CLOSED", "Campaign is not active.");
      case "network-error":
        return failure("NETWORK", "Network error (scripted scenario).");
      default:
        return failure("UNKNOWN", `Unknown scripted scenario "${current}".`);
    }
  }

  return {
    mode: "scripted",
    get scenario() {
      return scenario;
    },
    setScenario(next: ScriptedScenario) {
      scenario = next;
    },

    async checkAvailability(): Promise<Availability> {
      return scenario === "closed"
        ? { open: false, reason: "CLOSED" }
        : { open: true };
    },

    async draw(): Promise<DrawResult> {
      if (!warned) {
        warned = true;
        warn(DEMO_GATEWAY_WARNING);
      }
      await sleep(SCRIPTED_LATENCY_MS);
      return outcomeFor(scenario);
    },

    async confirmCoupon() {
      return { ok: true };
    },
  };
}
