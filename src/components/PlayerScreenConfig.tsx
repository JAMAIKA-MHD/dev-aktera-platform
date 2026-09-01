import React, { useState, useEffect } from "react";
import { Campaign } from "../types";
import { PhoneFrame } from "./PhoneFrame";
import { PlayerLanding } from "./PlayerLanding";
import { useCampaigns } from "../hooks/useCampaigns";
import { useAuth } from "../contexts/AuthContext";
import { Smartphone, Check, Image as ImageIcon } from "lucide-react";

export function PlayerScreenConfig() {
  const { organization } = useAuth();
  const { campaigns } = useCampaigns(organization?.id ?? null);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("#6366F1");
  const [gradientFrom, setGradientFrom] = useState("#8B5CF6");
  const [gradientTo, setGradientTo] = useState("#6366F1");
  const [logoUrl, setLogoUrl] = useState<string>("");

  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  // Use the active campaign
  const activeCampaign =
    campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];

  const brandPreset = activeCampaign
    ? {
        name: activeCampaign.name,
        arabicName: activeCampaign.arabicName,
        primaryColor,
        gradientFrom,
        gradientTo,
        description: `Participate & Win premium voucher codes or physical merchandise.`,
        logoUrl: logoUrl || activeCampaign.heroImageUrl,
        prizes: activeCampaign.prizes.map((p) => ({
          name: "Mystery Reward",
          icon: "🎁",
          isWin: true,
        })),
      }
    : null;

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
      {/* Config Form */}
      <div className="flex-1 bg-card-bg border border-brand-border rounded-3xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-brand-text mb-6">
          Player Screen Customization
        </h2>

        <div className="space-y-6">
          {/* Game Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-brand-text">
              Select Game (Campaign)
            </label>
            <div className="relative">
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-blue-500 appearance-none cursor-pointer transition-colors"
              >
                {campaigns.length === 0 && (
                  <option value="">No games available</option>
                )}
                {campaigns.map((c) => {
                  const label =
                    c.gameType === "lucky_wheel"
                      ? "Lucky Wheel"
                      : c.gameType === "quiz"
                        ? "Quiz Challenge"
                        : c.gameType === "scratch_card"
                          ? "Scratch Card"
                          : c.gameType === "mystery_box"
                            ? "Mystery Box"
                            : "Hit It Challenge";
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({label})
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-brand-textMuted">
                <i className="fa-solid fa-chevron-down"></i>
              </div>
            </div>
          </div>

          <div className="h-px bg-brand-border w-full"></div>

          {/* Color Customization */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-brand-text">
              Theme Colors
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-brand-textMuted font-medium block">
                  Primary Accent
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-brand-border p-1 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-black/5 dark:bg-white/5 border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-brand-textMuted font-medium block">
                  Gradient Top (Background)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={gradientFrom}
                    onChange={(e) => setGradientFrom(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-brand-border p-1 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={gradientFrom}
                    onChange={(e) => setGradientFrom(e.target.value)}
                    className="flex-1 bg-black/5 dark:bg-white/5 border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-brand-textMuted font-medium block">
                  Gradient Bottom (Background)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={gradientTo}
                    onChange={(e) => setGradientTo(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-brand-border p-1 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={gradientTo}
                    onChange={(e) => setGradientTo(e.target.value)}
                    className="flex-1 bg-black/5 dark:bg-white/5 border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-brand-border w-full"></div>

          {/* Icon / Image Customization */}
          <div className="space-y-4">
            <h3 className="text-md font-semibold text-brand-text">
              Hero Image / Logo
            </h3>
            <div className="space-y-2">
              <label className="text-xs text-brand-textMuted font-medium block">
                Logo URL
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-brand-textMuted">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-black/5 dark:bg-white/5 border border-brand-border rounded-xl pl-10 pr-4 py-2 text-sm text-brand-text focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-brand-textMuted">
                Provide a direct URL to an image or logo. If left blank, it will
                use the campaign's hero image.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex justify-end gap-3">
            <button className="px-5 py-2.5 rounded-xl border border-brand-border hover:bg-black/5 dark:hover:bg-white/5 text-sm font-semibold transition-colors">
              Reset
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 text-sm font-semibold flex items-center gap-2 transition-all">
              <Check className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 flex flex-col items-center">
        <div className="mb-3 text-sm font-bold text-brand-text flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-brand-textMuted" />
          Live Preview
        </div>
        <div className="h-[700px] w-full max-w-[360px] mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 dark:border-slate-700 relative flex flex-col bg-slate-900">
          {!brandPreset ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              No game selected
            </div>
          ) : (
            <PlayerLanding
              activeBrand={brandPreset}
              onRegister={() => {}}
              savedData={{ name: "", phone: "", consent: false }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
