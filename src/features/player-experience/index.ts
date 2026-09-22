// Public API of the Player Experience module: the only file the rest of the app may import.
// Each export is enabled by the task that creates it.

// export { PlayerExperience } from "./runtime/PlayerExperience";          // T4.1
// export { PlayerExperienceStudio } from "./studio/PlayerExperienceStudio"; // T6.2

export { createLocalServices } from "./services/createLocalServices";
export { ServicesProvider } from "./services/ServicesProvider";
// Document of its own for the runtime (/xp-frame): loaded lazily by AppRouter.
export { FrameHost } from "./runtime/host/FrameHost";

export type { ExperienceConfig } from "./domain/types";
export type { CampaignSnapshot } from "./domain/campaign";
