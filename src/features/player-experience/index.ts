// Public API of the Player Experience module: the only file the rest of the app may import.
// Each export is enabled by the task that creates it.

export { PlayerExperience } from "./runtime/PlayerExperience";
export { PlayerExperienceStudio } from "./studio/PlayerExperienceStudio";
export type { PlayerExperienceStudioProps } from "./studio/PlayerExperienceStudio";
// The Studio on the dashboard's own campaigns (T7.1): loaded lazily by App.
export { CampaignStudio } from "./studio/CampaignStudio";
export type { CampaignStudioProps } from "./studio/CampaignStudio";
export type { CampaignSettingsSection } from "./studio/StudioContext";
// The dashboard's player sandbox on the real runtime (T7.2): loaded lazily by App.
export { CampaignSimulator } from "./studio/CampaignSimulator";
export type { CampaignSimulatorProps } from "./studio/CampaignSimulator";

export { createLocalServices } from "./services/createLocalServices";
// The public player page's services: the live gateway on select-prize (backend B3.4).
export { createPublicServices } from "./services/createSupabaseServices";
export type {
  PublicServicesOptions,
  StudioBackend,
} from "./services/createSupabaseServices";
// What the public page /play/:slug reads (backend B5.2): the campaign, its design, its availability.
export { loadPublicExperience } from "./services/supabase/loadPublicExperience";
export type { PublicExperience } from "./domain/publicCampaign";
export { pickInitialLocale } from "./domain/locale";
export type { Locale } from "./domain/locale";
export { ServicesProvider } from "./services/ServicesProvider";
// Document of its own for the runtime (/xp-frame): loaded lazily by AppRouter.
export { FrameHost } from "./runtime/host/FrameHost";

export type { ExperienceConfig } from "./domain/types";
export type { CampaignSnapshot } from "./domain/campaign";
