import React, { useState } from "react";
import { Campaign, PlayerScreenConfig } from "../../types";
import { PlayerEditorLeftNav, EditorScreenType } from "./PlayerEditorLeftNav";
import { PlayerEditorCanvas } from "./PlayerEditorCanvas";
import { PlayerEditorSettings } from "./PlayerEditorSettings";
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  ChevronDown,
} from "lucide-react";

interface PlayerEditorShellProps {
  campaigns: Campaign[];
  selectedCampaignId?: string | null;
  onSelectCampaign: (id: string) => void;
  onClose: () => void;
  onSave: (campaignId: string, config: PlayerScreenConfig) => void;
}

const DEFAULT_CONFIG: PlayerScreenConfig = {
  theme: {
    logoUrl: "",
    faviconUrl: "",
    showBrandWatermark: true,
    primaryColor: "#6C4DFF",
    secondaryColor: "#00C2A8",
    accentColor: "#FFD166",
    background: { type: "solid", value: "#0B0F1E" },
    fontFamily: "Inter, sans-serif",
    borderRadius: "rounded",
    modalShadow: true,
    mode: "dark",
  },
  gameAssets: {
    sound: { muted: false },
  },
  content: {
    preGame: {
      title: "Win Big!",
      subHeader: "Enter your details to spin the wheel",
      rulesText: "Terms apply.",
      formFields: [],
    },
    winState: { title: "You Won!", ctaLabel: "Claim Now", ctaAction: "claim" },
    loseState: {
      title: "Better luck next time",
      ctaLabel: "Try Again",
      ctaAction: "retry",
    },
    gameParams: { timerSeconds: 30, dailyAttempts: 1 },
  },
};

// Helper to deep merge with defaults
function mergeConfig(dbConfig?: any): PlayerScreenConfig {
  let parsed = dbConfig;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      parsed = {};
    }
  }

  if (!parsed || Object.keys(parsed).length === 0) return DEFAULT_CONFIG;

  return {
    theme: {
      ...DEFAULT_CONFIG.theme,
      ...(parsed.theme || {}),
      background: {
        ...DEFAULT_CONFIG.theme.background,
        ...(parsed.theme?.background || {}),
      },
    },
    gameAssets: {
      ...DEFAULT_CONFIG.gameAssets,
      ...(parsed.gameAssets || {}),
      sound: {
        ...DEFAULT_CONFIG.gameAssets.sound,
        ...(parsed.gameAssets?.sound || {}),
      },
    },
    content: {
      ...DEFAULT_CONFIG.content,
      ...(parsed.content || {}),
      preGame: {
        ...DEFAULT_CONFIG.content.preGame,
        ...(parsed.content?.preGame || {}),
      },
      winState: {
        ...DEFAULT_CONFIG.content.winState,
        ...(parsed.content?.winState || {}),
      },
      loseState: {
        ...DEFAULT_CONFIG.content.loseState,
        ...(parsed.content?.loseState || {}),
      },
      gameParams: {
        ...DEFAULT_CONFIG.content.gameParams,
        ...(parsed.content?.gameParams || {}),
      },
    },
  };
}

export function PlayerEditorShell({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onClose,
  onSave,
}: PlayerEditorShellProps) {
  const campaign =
    campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  // Initialize with existing config or default
  const [config, setConfig] = React.useState<PlayerScreenConfig>(
    mergeConfig(campaign?.playerScreenConfig),
  );

  // Reset config when campaign changes
  React.useEffect(() => {
    if (campaign) {
      setConfig(mergeConfig(campaign.playerScreenConfig));
    }
  }, [campaign?.id]);

  const [activeScreen, setActiveScreen] =
    useState<EditorScreenType>("pre-game");
  const [deviceType, setDeviceType] = useState<"desktop" | "tablet" | "mobile">(
    "mobile",
  );

  const handlePublish = () => {
    if (campaign) onSave(campaign.id, config);
  };

  const handleSaveDraft = () => {
    if (campaign) onSave(campaign.id, config);
  };

  if (!campaign) {
    return (
      <div className="fixed inset-0 z-50 bg-brand-dark flex flex-col items-center justify-center text-brand-text">
        <p className="text-brand-text-muted">
          No campaigns available. Create one first.
        </p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 glass-panel border border-brand-border rounded transition-colors hover:bg-brand-surface/50"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand-dark flex flex-col font-sans z-[100]">
      {/* Top Bar (Editor Chrome) */}
      <header className="h-16 glass-panel border-b border-brand-border flex items-center justify-between px-4 shrink-0 text-brand-text">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-brand-surface flex items-center justify-center transition-colors border border-transparent hover:border-brand-border"
          >
            <ArrowLeft className="w-5 h-5 text-brand-text-muted" />
          </button>
          <div className="flex items-center gap-2 relative group">
            <select
              value={campaign.id}
              onChange={(e) => onSelectCampaign(e.target.value)}
              className="appearance-none bg-brand-surface/50 hover:bg-brand-surface border border-brand-border hover:border-brand-primary text-sm font-bold truncate max-w-[250px] outline-none cursor-pointer text-brand-text py-1.5 pl-3 pr-8 rounded-md transition-all shadow-sm"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id} className="bg-brand-dark">
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-brand-text-muted absolute right-2 pointer-events-none group-hover:text-brand-primary transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Device Toggles */}
          <div className="flex items-center glass-panel p-1 rounded-lg border border-brand-border">
            {[
              { id: "desktop", icon: Monitor },
              { id: "tablet", icon: Tablet },
              { id: "mobile", icon: Smartphone },
            ].map((dev) => {
              const Icon = dev.icon;
              const isActive = deviceType === dev.id;
              return (
                <button
                  key={dev.id}
                  onClick={() => setDeviceType(dev.id as any)}
                  className={`p-1.5 rounded-md transition-colors ${
                    isActive
                      ? "bg-brand-primary text-white shadow"
                      : "text-brand-text-muted hover:text-brand-text"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 mr-2 border-r border-brand-border pr-4">
            <button
              className="p-1.5 text-brand-text-muted hover:text-brand-text transition-colors"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 text-brand-text-muted hover:text-brand-text transition-colors"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-brand-border hover:bg-brand-surface transition-colors text-brand-text"
          >
            Save Draft
          </button>

          <div className="flex rounded-lg overflow-hidden">
            <button
              onClick={handlePublish}
              className="px-4 py-2 text-sm font-semibold bg-brand-primary hover:opacity-90 transition-colors text-white"
            >
              Publish
            </button>
            <button className="px-2 py-2 bg-brand-primary hover:opacity-90 transition-colors border-l border-white/20 text-white">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <main className="flex-1 flex overflow-hidden">
        <PlayerEditorLeftNav
          activeScreen={activeScreen}
          onChangeScreen={setActiveScreen}
        />

        <PlayerEditorCanvas deviceType={deviceType} config={config} />

        <PlayerEditorSettings
          config={config}
          onChange={setConfig}
          gameType={campaign.gameType}
        />
      </main>
    </div>
  );
}
