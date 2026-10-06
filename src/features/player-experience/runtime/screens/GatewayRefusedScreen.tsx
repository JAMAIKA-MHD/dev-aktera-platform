import { Hourglass } from "lucide-react";
import { useEffect } from "react";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import { STATUS_TEXT } from "../../presets/contentDefaults";
import type { GatewayMode } from "../../services/ports";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { ScreenMedallion } from "./ScreenMedallion";
import { textContent } from "./textContent";

// Shown instead of the game when the page got a participation gateway it must not use: a
// demo or scripted gateway on the public route would draw outcomes in the browser (N1,
// plan §7.4). The player gets a calm message and the legal links; the developer, the reason.
export function GatewayRefusedScreen({
  config,
  locale,
  mode,
  allowed,
  logoUrl,
  statusBadge,
}: {
  config: ExperienceConfig;
  locale: Locale;
  mode: GatewayMode;
  allowed: readonly GatewayMode[];
  logoUrl: string | null;
  statusBadge: string | null;
}) {
  useEffect(() => {
    console.error(
      `PlayerExperience: the "${mode}" participation gateway is not allowed here (allowed: ${allowed.join(", ") || "none"}). No game is shown.`,
    );
  }, [mode, allowed]);
  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={textContent({
        title: STATUS_TEXT.unavailableTitle,
        subtitle: STATUS_TEXT.unavailableBody,
      })}
      logoUrl={logoUrl}
      statusBadge={statusBadge}
      live={false}
    >
      <ScreenMedallion icon={Hourglass} />
    </ExperienceFrame>
  );
}
