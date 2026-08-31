import React, { useState } from "react";
import { PlayerScreenConfig, Campaign } from "../../types";
import { Palette, Image, Type } from "lucide-react";

interface PlayerEditorSettingsProps {
  campaign: Campaign;
  config: PlayerScreenConfig;
  onChange: (config: PlayerScreenConfig) => void;
  logicConfig: any;
  onLogicChange: (logicConfig: any) => void;
}

type TabId = "theme" | "assets" | "content";

export function PlayerEditorSettings({
  campaign,
  config,
  onChange,
  logicConfig,
  onLogicChange,
}: PlayerEditorSettingsProps) {
  const gameType = campaign.gameType;
  const [activeTab, setActiveTab] = useState<TabId>("theme");

  const tabs = [
    { id: "theme" as TabId, label: "Global Theme", icon: Palette },
    { id: "assets" as TabId, label: "Game Assets", icon: Image },
    { id: "content" as TabId, label: "Content & Logic", icon: Type },
  ];

  const handleThemeChange = (
    key: keyof PlayerScreenConfig["theme"],
    value: any,
  ) => {
    onChange({
      ...config,
      theme: { ...config.theme, [key]: value },
    });
  };

  return (
    <div className="w-80 bg-brand-dark border-l border-brand-border flex flex-col h-full shrink-0 text-brand-text text-sm">
      {/* Tabs Header */}
      <div className="flex border-b border-brand-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={`flex-1 py-4 flex justify-center border-b-2 transition-colors ${
                isActive
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-brand-text-muted hover:text-brand-text"
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "theme" && (
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-4 rounded-xl shadow-sm flex flex-col gap-4">
              <h3 className="text-brand-text font-bold text-sm uppercase tracking-wider">
                Brand Assets
              </h3>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold">Logo URL</label>
                <input
                  type="url"
                  value={config.theme.logoUrl || ""}
                  onChange={(e) => handleThemeChange("logoUrl", e.target.value)}
                  placeholder="https://..."
                  className="bg-brand-dark border border-brand-border focus:border-brand-primary rounded-lg px-3 py-2 text-brand-text outline-none"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="showWatermark"
                  checked={config.theme.showBrandWatermark}
                  onChange={(e) =>
                    handleThemeChange("showBrandWatermark", e.target.checked)
                  }
                  className="w-4 h-4 rounded bg-brand-dark border-brand-border"
                />
                <label htmlFor="showWatermark" className="text-xs">
                  Show Aktera Watermark
                </label>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl shadow-sm flex flex-col gap-4">
              <h3 className="text-brand-text font-bold text-sm uppercase tracking-wider">
                Brand Colors
              </h3>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded shrink-0 border border-brand-border overflow-hidden relative">
                    <input
                      type="color"
                      value={config.theme.primaryColor}
                      onChange={(e) =>
                        handleThemeChange("primaryColor", e.target.value)
                      }
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[10px] uppercase font-bold text-brand-text-muted">
                      Primary
                    </span>
                    <input
                      type="text"
                      value={config.theme.primaryColor}
                      onChange={(e) =>
                        handleThemeChange("primaryColor", e.target.value)
                      }
                      className="bg-brand-dark border border-brand-border focus:border-brand-primary rounded px-2 py-1 text-brand-text outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded shrink-0 border border-brand-border overflow-hidden relative">
                    <input
                      type="color"
                      value={config.theme.secondaryColor}
                      onChange={(e) =>
                        handleThemeChange("secondaryColor", e.target.value)
                      }
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[10px] uppercase font-bold text-brand-text-muted">
                      Secondary
                    </span>
                    <input
                      type="text"
                      value={config.theme.secondaryColor}
                      onChange={(e) =>
                        handleThemeChange("secondaryColor", e.target.value)
                      }
                      className="bg-brand-dark border border-brand-border focus:border-brand-primary rounded px-2 py-1 text-brand-text outline-none text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-semibold">
                    Background Fill
                  </label>
                  <div className="flex gap-2 mb-2">
                    {["solid", "gradient", "image"].map((type) => (
                      <button
                        key={type}
                        onClick={() =>
                          handleThemeChange("background", {
                            ...config.theme.background,
                            type,
                          })
                        }
                        className={`flex-1 py-1 text-[10px] uppercase font-bold rounded border transition-colors ${
                          config.theme.background.type === type
                            ? "bg-brand-primary/20 border-brand-primary text-brand-primary"
                            : "border-brand-border text-brand-text-muted hover:border-brand-text-muted"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {config.theme.background.type === "image" ? (
                    <input
                      type="url"
                      value={config.theme.background.value}
                      onChange={(e) =>
                        handleThemeChange("background", {
                          type: "image",
                          value: e.target.value,
                        })
                      }
                      placeholder="Image URL..."
                      className="bg-brand-dark border border-brand-border focus:border-brand-primary rounded-lg px-3 py-2 text-brand-text outline-none text-xs"
                    />
                  ) : (
                    <input
                      type="text"
                      value={config.theme.background.value}
                      onChange={(e) =>
                        handleThemeChange("background", {
                          ...config.theme.background,
                          value: e.target.value,
                        })
                      }
                      placeholder={
                        config.theme.background.type === "gradient"
                          ? "#color1, #color2"
                          : "#color"
                      }
                      className="bg-brand-dark border border-brand-border focus:border-brand-primary rounded-lg px-3 py-2 text-brand-text outline-none text-xs font-mono"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl shadow-sm flex flex-col gap-4">
              <h3 className="text-brand-text font-bold text-sm uppercase tracking-wider">
                Typography & Style
              </h3>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold">Border Radius</label>
                <div className="flex gap-2">
                  {[
                    { id: "sharp", label: "Sharp" },
                    { id: "rounded", label: "Rounded" },
                    { id: "pill", label: "Pill" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleThemeChange("borderRadius", r.id)}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                        config.theme.borderRadius === r.id
                          ? "bg-brand-primary/20 border-brand-primary text-brand-primary"
                          : "border-brand-border text-brand-text-muted hover:border-brand-text-muted"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-xs font-semibold">Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleThemeChange("mode", "light")}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                      config.theme.mode === "light"
                        ? "bg-white text-black border-brand-border shadow-sm"
                        : "border-brand-border text-brand-text-muted hover:border-brand-text-muted bg-brand-surface"
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => handleThemeChange("mode", "dark")}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                      config.theme.mode === "dark"
                        ? "bg-gray-900 text-white border-brand-border shadow-sm"
                        : "border-brand-border text-brand-text-muted hover:border-brand-text-muted bg-brand-surface"
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "assets" && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Image className="w-12 h-12 text-brand-text-muted mb-4 opacity-50" />
            <p className="text-sm font-semibold text-brand-text">
              Game Assets (Phase 2)
            </p>
            <p className="text-xs text-brand-text-muted mt-2">
              Will show specific asset controls for{" "}
              {gameType === "lucky_wheel" ? "Wheel" : "Quiz"}.
            </p>
          </div>
        )}

        {activeTab === "content" && (
          <div className="flex flex-col gap-6">
            <div className="glass-panel p-4 rounded-xl shadow-sm flex flex-col gap-4">
              <h3 className="text-brand-text font-bold text-sm uppercase tracking-wider">
                {gameType === "lucky_wheel"
                  ? "Wheel Config"
                  : gameType === "quiz"
                    ? "Quiz Config"
                    : gameType === "hit_it"
                      ? "Hit It Config"
                      : "Game Config"}
              </h3>

              {gameType === "lucky_wheel" && (
                <div className="flex flex-col gap-2 text-sm text-brand-text-muted">
                  <p>
                    Wheel segments are automatically generated from your active
                    prizes. To change probabilities, edit the Prize Allocation
                    weights in the previous step.
                  </p>
                </div>
              )}

              {gameType === "quiz" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold">
                    Pass Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={logicConfig.pass_threshold_percentage || 100}
                    onChange={(e) =>
                      onLogicChange({
                        ...logicConfig,
                        pass_threshold_percentage: Number(e.target.value),
                      })
                    }
                    className="bg-brand-dark border border-brand-border focus:border-brand-primary rounded-lg px-3 py-2 text-brand-text outline-none"
                  />
                  <p className="text-xs text-brand-text-muted mt-1">
                    Players must score at least this percentage to win a prize.
                  </p>
                </div>
              )}

              {gameType === "hit_it" && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold">
                    Hits Needed to Win
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={logicConfig.win_threshold || 9}
                    onChange={(e) =>
                      onLogicChange({
                        ...logicConfig,
                        win_threshold: Number(e.target.value),
                      })
                    }
                    className="bg-brand-dark border border-brand-border focus:border-brand-primary rounded-lg px-3 py-2 text-brand-text outline-none"
                  />
                  <p className="text-xs text-brand-text-muted mt-1">
                    Number of successful hits required within the time limit.
                  </p>
                </div>
              )}

              {(gameType === "scratch_card" || gameType === "mystery_box") && (
                <div className="flex flex-col gap-2 text-sm text-brand-text-muted">
                  <p>
                    This game relies purely on the Win Probability you set in
                    Step 2. No additional logic configuration is required.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
