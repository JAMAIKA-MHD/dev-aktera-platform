import type {
  DrawRequest,
  DrawResult,
  ParticipationErrorCode,
} from "../../domain/participation";
import { isValidDzMobile, normalizeDzPhone } from "../../domain/phone";
import { createUuid } from "../../domain/uuid";
import type {
  Availability,
  ConfirmCouponResult,
  ParticipationGateway,
} from "../ports";
import { drawDemoOutcome, type RandomSource } from "./demoDrawEngine";
import {
  createDemoEntryStore,
  withDemoStock,
  type DemoEntryStore,
} from "./demoEntryStore";
import type { DemoCampaignRules } from "./demoRules";

// ParticipationGateway that simulates select-prize in the Studio (plan §7.3): same checks in
// the same order, same error codes, a draw by demoDrawEngine and a record in demoEntryStore.

export const DEMO_GATEWAY_WARNING =
  "Demo gateway — outcomes are simulated client-side. Never use on the public player route.";

export const DEMO_LATENCY_MS = { min: 400, max: 900 } as const;

export interface DemoParticipationGatewayOptions {
  rules: DemoCampaignRules;
  store?: DemoEntryStore;
  random?: RandomSource; // draws and coupon codes
  latencyMs?: () => number; // default: random between 400 and 900 ms, like a real network
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  warn?: (message: string) => void;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const failure = (
  code: ParticipationErrorCode,
  message: string,
): DrawResult => ({ ok: false, error: { code, message } });

export function createDemoParticipationGateway(
  options: DemoParticipationGatewayOptions,
): ParticipationGateway {
  const { rules } = options;
  const store = options.store ?? createDemoEntryStore();
  const random = options.random ?? Math.random;
  const latencyMs =
    options.latencyMs ??
    (() =>
      DEMO_LATENCY_MS.min +
      Math.random() * (DEMO_LATENCY_MS.max - DEMO_LATENCY_MS.min));
  const sleep = options.sleep ?? wait;
  const now = options.now ?? (() => new Date());
  const warn = options.warn ?? ((message: string) => console.warn(message));
  let warned = false;

  // Demo stock: the campaign stock minus the prizes already won in the demo.
  const soldOut = () => {
    const { prizes } = withDemoStock(rules, store);
    return prizes.length > 0 && prizes.every((prize) => prize.remaining === 0);
  };
  const isOpen = (campaignId: string) =>
    campaignId === rules.campaignId && rules.active;

  return {
    mode: "demo",

    async checkAvailability(campaignId: string): Promise<Availability> {
      if (!isOpen(campaignId)) return { open: false, reason: "CLOSED" };
      if (soldOut()) return { open: false, reason: "SOLD_OUT" };
      return { open: true };
    },

    async draw(request: DrawRequest): Promise<DrawResult> {
      if (!warned) {
        warned = true;
        warn(DEMO_GATEWAY_WARNING);
      }
      await sleep(latencyMs());

      // Idempotence: a retried request (same clientRequestId) gets the same answer,
      // and is never drawn nor counted twice.
      const previous = store.findByRequest(request.clientRequestId);
      if (previous) {
        return {
          ok: true,
          entryId: previous.entryId,
          outcome: previous.outcome,
        };
      }

      // The checks of select-prize, in the same order.
      if (!request.campaignId || !request.participant.phone) {
        return failure(
          "INVALID_INPUT",
          "campaign_id and phone_number are required.",
        );
      }
      const phone = normalizeDzPhone(request.participant.phone);
      if (!isValidDzMobile(phone)) {
        return failure(
          "INVALID_INPUT",
          "Invalid Algerian phone number format.",
        );
      }
      // Stricter than select-prize, which does not check it: no participation
      // without consent (Law 18-07).
      if (request.consent?.accepted !== true) {
        return failure("INVALID_INPUT", "Consent is required before playing.");
      }
      if (!isOpen(request.campaignId)) {
        return failure("CAMPAIGN_CLOSED", "Campaign is not active.");
      }
      if (
        rules.maxEntries > 0 &&
        store.countByPhone(request.campaignId, phone) >= rules.maxEntries
      ) {
        return failure(
          "ALREADY_PARTICIPATED",
          "You have already participated in this campaign.",
        );
      }
      if (soldOut()) {
        return failure(
          "CAMPAIGN_CLOSED",
          "This campaign is closed. All voucher rewards have been claimed.",
        );
      }

      const outcome = drawDemoOutcome(
        withDemoStock(rules, store),
        request.gamePayload,
        random,
      );
      const entryId = createUuid();
      store.record({
        entryId,
        campaignId: request.campaignId,
        phone,
        clientRequestId: request.clientRequestId,
        outcome,
        couponConfirmed: false,
        createdAt: now().toISOString(),
      });
      return { ok: true, entryId, outcome };
    },

    async confirmCoupon(entryId: string): Promise<ConfirmCouponResult> {
      if (store.confirmCoupon(entryId)) return { ok: true };
      return {
        ok: false,
        error: { code: "INVALID_INPUT", message: "Unknown entry." },
      };
    },
  };
}
