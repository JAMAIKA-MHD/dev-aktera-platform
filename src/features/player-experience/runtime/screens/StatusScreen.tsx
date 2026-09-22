import { CalendarX, UserCheck, WifiOff, type LucideIcon } from "lucide-react";
import type { LocalizedText } from "../../domain/locale";
import {
  PARTICIPATION_ERROR_MESSAGES,
  type ParticipationErrorCode,
} from "../../domain/participation";
import { STATUS_TEXT } from "../../presets/contentDefaults";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { ScreenMedallion } from "./ScreenMedallion";
import { press, type ScreenProps } from "./screenProps";
import { textContent } from "./textContent";

// The three non-winning outcomes of a draw (plan §8.5, tasks.md T4.3), reused from
// PlayerFlowPage.tsx's "duplicate", "inactive" and "error" screens. Each one names what
// happened, in the player's language, and always offers a way out (B9): the phone that
// already played and the closed campaign go back to the start; a network error offers
// "Try again" first, which retries the exact same attempt (RETRY keeps clientRequestId and
// gamePayload, domain/flow.ts) so the server never counts it twice.

type Status = "duplicate" | "closed" | "error";

const VARIANTS: Readonly<
  Record<
    Status,
    { icon: LucideIcon; title: LocalizedText; code: ParticipationErrorCode }
  >
> = {
  duplicate: {
    icon: UserCheck,
    title: STATUS_TEXT.duplicateTitle,
    code: "ALREADY_PARTICIPATED",
  },
  closed: {
    icon: CalendarX,
    title: STATUS_TEXT.closedTitle,
    code: "CAMPAIGN_CLOSED",
  },
  error: { icon: WifiOff, title: STATUS_TEXT.errorTitle, code: "NETWORK" },
};

export function StatusScreen({ flow, config, locale, chrome }: ScreenProps) {
  const { state } = flow;
  const status = state.screen as Status;
  const variant = VARIANTS[status];
  // The error the gateway gave, when there is one; its default code otherwise (a status
  // forced by the Studio preview, domain/flow.ts createPreviewFlowState).
  const message =
    PARTICIPATION_ERROR_MESSAGES[state.error?.code ?? variant.code];
  const retryable = status === "error";
  const restart = press(flow, flow.restart, "primary");

  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={textContent({
        title: variant.title,
        subtitle: message,
        primaryCta: retryable ? STATUS_TEXT.retry : STATUS_TEXT.back,
        secondaryCta: retryable ? STATUS_TEXT.back : undefined,
      })}
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      cta={
        retryable
          ? {
              onPrimary: press(flow, flow.retry, "primary"),
              onSecondary: press(flow, flow.restart, "secondary"),
            }
          : { onPrimary: restart }
      }
    >
      <ScreenMedallion icon={variant.icon} />
    </ExperienceFrame>
  );
}
