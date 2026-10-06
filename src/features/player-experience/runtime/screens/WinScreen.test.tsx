import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createInitialFlowState, type FlowState } from "../../domain/flow";
import type { GameType } from "../../domain/gameTypes";
import type { DrawPrize } from "../../domain/participation";
import type { ExperienceConfig } from "../../domain/types";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { createLocalServices } from "../../services/createLocalServices";
import type { ExperienceServices } from "../../services/ports";
import { ServicesProvider } from "../../services/ServicesProvider";
import { runtimeAudio } from "../feedback/audio";
import { PlayerExperience } from "../PlayerExperience";
import type { ExperienceFlow } from "../useExperienceFlow";
import { WinScreen } from "./WinScreen";

// The win screen (tasks.md T4.4): a ticket with the prize, its code, copy and a single
// confirmation, plus optional sharing. Most tests play the real journey (the Studio's
// preview forces "win" like it would in T6.2), which also exercises CONFIRM_COUPON end to
// end; a few construct the flow state directly for the contract cases no local gateway
// produces (no coupon code issued).

// canvas-confetti draws on a real <canvas>; jsdom has none (FrameHost.test.tsx's pattern).
const confetti = vi.hoisted(() => {
  const fire = Object.assign(vi.fn(), { reset: vi.fn() });
  return { fire, create: vi.fn(() => fire) };
});
vi.mock("canvas-confetti", () => ({ default: { create: confetti.create } }));

function setup(
  options: {
    gameType?: GameType;
    services?: ExperienceServices;
  } = {},
) {
  const gameType = options.gameType ?? "lucky_wheel";
  const campaign = createDemoCampaign(gameType);
  const config = createDefaultExperience({ gameType, campaign });
  const services =
    options.services ??
    createLocalServices({ participation: "scripted", campaign });
  const track = vi.spyOn(services.analytics, "track");
  const confirm = vi.spyOn(services.participation, "confirmCoupon");
  render(
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale="fr"
        allowedGatewayModes={["scripted"]}
        initialScreen="win"
      />
    </ServicesProvider>,
  );
  return { user: userEvent.setup(), track, confirm, campaign, config };
}

const codeButton = () => screen.getByText("DEMO-0000-0000").closest("button")!;
const confirmButton = () =>
  screen.queryByText("J'ai copié mon code")?.closest("button") ?? null;

// A win state built directly (not through the reducer), for the outcome shapes no local
// gateway produces: no coupon code, or an outcome that carries no prize.
function renderWithOutcome(
  outcome: {
    couponCode: string | null;
    prize?: DrawPrize | null;
  },
  customize?: (config: ExperienceConfig) => void,
) {
  const campaign = createDemoCampaign("lucky_wheel");
  const config = createDefaultExperience({ gameType: "lucky_wheel", campaign });
  customize?.(config);
  const prize =
    outcome.prize === null
      ? null
      : (outcome.prize ?? {
          id: campaign.prizes[0].id,
          name: campaign.prizes[0].name,
          winMessage: null,
        });
  const state: FlowState = {
    ...createInitialFlowState("lucky_wheel", { startedAt: 0 }),
    screen: "win",
    entryId: "entry-1",
    outcome: { isWinner: true, prize, couponCode: outcome.couponCode },
  };
  const flow = {
    state,
    couponStatus: "idle",
    restart: vi.fn(),
    confirmCoupon: vi.fn(),
    track: vi.fn(),
  } as unknown as ExperienceFlow;
  return render(
    <WinScreen
      flow={flow}
      config={config}
      campaign={campaign}
      locale="fr"
      chrome={{ logoUrl: null, statusBadge: null, live: true }}
    />,
  );
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {}); // demo gateway warning
  vi.spyOn(window, "open").mockImplementation(() => null);
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("WinScreen", () => {
  it("shows the first prize with its DEMO code, and celebrates once", () => {
    const { campaign } = setup();
    expect(screen.getByText(campaign.prizes[0].name)).toBeTruthy();
    expect(screen.getByText("DEMO-0000-0000")).toBeTruthy();
    expect(confetti.fire).toHaveBeenCalled();
  });

  it("plays the win sound and a short vibration once, not on every re-render", () => {
    const play = vi.spyOn(runtimeAudio, "play");
    const vibrateSpy = vi.fn(() => true);
    vi.stubGlobal("navigator", { ...navigator, vibrate: vibrateSpy });
    setup();
    expect(play).toHaveBeenCalledWith("win");
    expect(play).toHaveBeenCalledTimes(1);
    expect(vibrateSpy).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("copies the code to the clipboard, shows it, and reports it once", async () => {
    const { user, track } = setup();
    await user.click(codeButton());
    expect(await navigator.clipboard.readText()).toBe("DEMO-0000-0000");
    expect(screen.getByText("Copié !")).toBeTruthy();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ name: "coupon_copied" }),
    );
  });

  it("confirms the coupon once, even with a second click, and never sends it twice", async () => {
    const { confirm } = setup();
    expect(confirmButton()).toBeTruthy();
    fireEvent.click(confirmButton()!);
    await vi.waitFor(() =>
      expect(screen.getByText("Merci, c'est noté !")).toBeTruthy(),
    );
    expect(confirmButton()).toBeNull(); // spent: no second attempt possible
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("shows the button waiting while the confirmation is in flight", async () => {
    const services = createLocalServices({
      participation: "scripted",
      campaign: createDemoCampaign("lucky_wheel"),
    });
    let resolveConfirm: (result: { ok: true }) => void;
    vi.spyOn(services.participation, "confirmCoupon").mockReturnValue(
      new Promise((resolve) => {
        resolveConfirm = resolve;
      }),
    );
    setup({ services });
    fireEvent.click(confirmButton()!);
    const waiting = screen.getByText("Confirmation…").closest("button")!;
    expect(waiting.hasAttribute("disabled")).toBe(true);
    resolveConfirm!({ ok: true });
    await vi.waitFor(() =>
      expect(screen.getByText("Merci, c'est noté !")).toBeTruthy(),
    );
  });

  it("stays calm when the confirmation fails: the code is already there", async () => {
    const services = createLocalServices({
      participation: "scripted",
      campaign: createDemoCampaign("lucky_wheel"),
    });
    vi.spyOn(services.participation, "confirmCoupon").mockResolvedValue({
      ok: false,
      error: { code: "NETWORK", message: "offline" },
    });
    setup({ services });
    fireEvent.click(confirmButton()!);
    await vi.waitFor(() =>
      expect(
        screen.getByText(
          "Votre code reste valable même si la confirmation a échoué.",
        ),
      ).toBeTruthy(),
    );
    expect(screen.queryByText("Merci, c'est noté !")).toBeNull();
    expect(confirmButton()).toBeNull(); // still spent, not alarming
  });

  it("opens WhatsApp and Facebook with the prize and the page link, and reports each", () => {
    const { track, campaign } = setup();
    fireEvent.click(screen.getByText("Partager sur WhatsApp"));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://api.whatsapp.com/send?text="),
      "_blank",
      "noopener,noreferrer",
    );
    const whatsappUrl = vi.mocked(window.open).mock.calls[0][0] as string;
    expect(decodeURIComponent(whatsappUrl)).toContain(campaign.prizes[0].name);
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "share_clicked",
        data: { kind: "whatsapp" },
      }),
    );
    fireEvent.click(screen.getByText("Partager sur Facebook"));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://www.facebook.com/sharer/sharer.php?u="),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("goes back to the start on Terminer", () => {
    setup();
    fireEvent.click(screen.getByText("Terminer"));
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
  });

  it("never invents a fallback code: shows how to collect the prize instead", () => {
    renderWithOutcome({
      couponCode: null, // the server issued no code (e.g. an in-store prize)
    });
    expect(
      screen.getByText(
        "Présentez cet écran à un conseiller pour récupérer votre lot.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("AKT-DZ-9824X")).toBeNull();
    expect(screen.queryByText("J'ai copié mon code")).toBeNull(); // nothing to confirm
  });

  it("shows the campaign's own win message when the prize has one", () => {
    const { campaign } = setup();
    expect(screen.getByText(campaign.prizes[0].winMessage!)).toBeTruthy();
  });

  it("names no prize when the outcome carries none, without crashing", () => {
    renderWithOutcome({ couponCode: "DEMO-1234-5678", prize: null });
    expect(screen.getByText("DEMO-1234-5678")).toBeTruthy();
  });

  it("hides the eyebrow badge when the brand and the organizer are both unnamed", () => {
    // Scoped to the interaction slot (PrimaryInteractionSlot): the screen's own ticket,
    // never the frame header, which clamps its own brand text independently.
    const clamped = (container: HTMLElement) =>
      container.querySelectorAll('[data-xp-slot="interaction"] [data-xp-clamp]')
        .length;
    const { container: named } = renderWithOutcome(
      { couponCode: "DEMO-1234-5678" },
      (config) => {
        config.brand.name = "Zeta Market";
      },
    );
    const withBadge = clamped(named);
    // Default fixtures carry no brand or organizer name: nothing to customize away.
    const { container: unnamed } = renderWithOutcome({
      couponCode: "DEMO-1234-5678",
    });
    expect(clamped(unnamed)).toBe(withBadge - 1); // only the eyebrow line is gone
  });
});
