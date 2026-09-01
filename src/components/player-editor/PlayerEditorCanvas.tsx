import React from "react";
import { Campaign, PlayerScreenConfig, BrandPreset, Prize } from "../../types";
import { EditorScreenType } from "./PlayerEditorLeftNav";
import { PhoneFrame } from "../PhoneFrame";
import { PlayerLanding } from "../PlayerLanding";
import { PlayerGame } from "../PlayerGame";
import { PlayerScratch } from "../PlayerScratch";
import { PlayerMysteryBox } from "../PlayerMysteryBox";
import { PlayerHitIt } from "../PlayerHitIt";
import { PlayerQuiz } from "../PlayerQuiz";
import { PlayerResult } from "../PlayerResult";

const LOSER_SLOT: Prize = {
  id: "loser_slot",
  name: "Better Luck Next Time",
  icon: "🌙",
  isWin: false,
  color: "#64748B",
};

interface PlayerEditorCanvasProps {
  deviceType: "desktop" | "tablet" | "mobile";
  config: PlayerScreenConfig;
  activeScreen?: EditorScreenType;
  campaign?: Campaign;
  logicConfig?: any;
}

export function PlayerEditorCanvas({
  deviceType,
  config,
  activeScreen = "pre-game",
  campaign,
  logicConfig,
}: PlayerEditorCanvasProps) {
  const { theme } = config;
  const gameType = campaign?.gameType || "lucky_wheel";

  const primaryColor = theme.primaryColor || "#6C4DFF";
  const secondaryColor = theme.secondaryColor || "#00C2A8";

  const editorBrandPreset: BrandPreset = {
    name: campaign?.name || "Demo Brand",
    arabicName:
      campaign?.arabicName || "سجل في المسابقة واربح هدايا فورية قيمة! 🎁",
    primaryColor,
    gradientFrom:
      theme.background?.type === "gradient" && theme.background?.value
        ? theme.background.value.split(",")[0] || primaryColor
        : primaryColor,
    gradientTo:
      theme.background?.type === "gradient" && theme.background?.value
        ? theme.background.value.split(",")[1] || secondaryColor
        : secondaryColor,
    description:
      config.content?.preGame?.subHeader ||
      "Participate & Win premium rewards in real-time.",
    logoUrl: theme.logoUrl || campaign?.heroImageUrl || "",
    prizes:
      campaign?.prizes && campaign.prizes.length > 0
        ? campaign.prizes.map((p, idx) => ({
            name: `Prize Reward ${idx + 1}`,
            icon: "🎁",
            isWin: true,
          }))
        : [
            { name: "Special Voucher Prize", icon: "🎁", isWin: true },
            { name: "Better Luck Next Time", icon: "🌙", isWin: false },
          ],
  };

  const renderActiveScreenContent = () => {
    switch (activeScreen) {
      case "pre-game":
        return (
          <PlayerLanding
            activeBrand={editorBrandPreset}
            onRegister={() => {}}
            savedData={{
              name: "Demo Player",
              phone: "0555123456",
              email: "",
              consent: true,
            }}
          />
        );

      case "game":
        if (gameType === "quiz") {
          return (
            <PlayerQuiz
              activeBrand={editorBrandPreset}
              questions={
                campaign?.questions && campaign.questions.length > 0
                  ? campaign.questions
                  : [
                      {
                        id: "demo_q1",
                        questionText:
                          "What is the official currency of Algeria?",
                        options: ["Algerian Dinar", "Dirham", "Euro", "Riyal"],
                        correctIndex: 0,
                      },
                    ]
              }
              playerName="Demo Player"
              onComplete={() => {}}
            />
          );
        } else if (gameType === "hit_it") {
          return (
            <PlayerHitIt
              activeBrand={editorBrandPreset}
              winThreshold={logicConfig?.win_threshold ?? 8}
              onComplete={() => {}}
            />
          );
        } else if (gameType === "mystery_box") {
          return (
            <PlayerMysteryBox
              activeBrand={editorBrandPreset}
              onComplete={() => {}}
            />
          );
        } else if (gameType === "scratch_card") {
          return (
            <PlayerScratch
              activeBrand={editorBrandPreset}
              targetPrize={{
                ...LOSER_SLOT,
                isWin: true,
                name: "Special Voucher Code",
                color: primaryColor,
              }}
              onGameComplete={() => {}}
            />
          );
        } else {
          return (
            <PlayerGame
              activeBrand={editorBrandPreset}
              forcedOutcome="random"
              onGameComplete={() => {}}
              playerName="Demo Player"
            />
          );
        }

      case "win":
        return (
          <PlayerResult
            activeBrand={editorBrandPreset}
            prize={{
              id: "demo_win",
              name: config.content?.winState?.title || "VIP Voucher Prize 🎁",
              isWin: true,
              couponCode: "WIN-DEMO-2026",
              color: primaryColor,
              icon: "🎁",
            }}
            onRestart={() => {}}
            playerName="Demo Player"
          />
        );

      case "lose":
        return (
          <PlayerResult
            activeBrand={editorBrandPreset}
            prize={{
              id: "demo_lose",
              name:
                config.content?.loseState?.title || "Better Luck Next Time 🌙",
              isWin: false,
              color: "#64748B",
              icon: "🌙",
            }}
            onRestart={() => {}}
            playerName="Demo Player"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-[#0B0F1E] flex flex-col items-center justify-center overflow-y-auto p-4 sm:p-6 relative select-none">
      {/* Viewport Frame */}
      <div className="relative flex items-center justify-center">
        {deviceType === "mobile" ? (
          <PhoneFrame compact={true}>
            <div className="flex-1 flex flex-col h-full bg-[#0F0F1A] overflow-hidden">
              {renderActiveScreenContent()}
            </div>
          </PhoneFrame>
        ) : (
          <div
            className={`flex flex-col bg-[#0F0F1A] border-4 border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
              deviceType === "tablet"
                ? "w-[480px] h-[680px]"
                : "w-[720px] h-[680px]"
            }`}
          >
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {renderActiveScreenContent()}
            </div>
          </div>
        )}
      </div>

      {/* Brand Watermark indicator */}
      {theme.showBrandWatermark && (
        <div className="mt-3 text-center pointer-events-none">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 opacity-70">
            Powered by Aktera Player Studio
          </span>
        </div>
      )}
    </div>
  );
}
