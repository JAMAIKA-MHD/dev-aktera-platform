import React, { useState } from "react";
import { UIElement } from "../types";
import { useEditorStore } from "../store/useEditorStore";

export interface PresetItem {
  name: string;
  category:
    | "game_mechanics"
    | "buttons"
    | "hud"
    | "typography"
    | "containers"
    | "visuals";
  icon: string;
  gameType?:
    "lucky_wheel" | "scratch_card" | "mystery_box" | "hit_it" | "quiz" | "all";
  element: Partial<UIElement>;
}

export const PRESET_LIBRARY: PresetItem[] = [
  // 1. GAME MECHANIC PRESETS
  {
    name: "Lucky Spin Wheel",
    category: "game_mechanics",
    icon: "fa-solid fa-compact-disc",
    gameType: "lucky_wheel",
    element: {
      type: "panel",
      name: "Spin Wheel Surface",
      slotId: "wheelContainer",
      transform: {
        position: { x: 50, y: 48 },
        size: { width: 75, height: 42 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "preserve-aspect",
      },
      style: {
        backgroundColor: "rgba(99, 102, 241, 0.08)",
        borderRadius: "9999px",
        borderWidth: "3px",
        borderColor: "#6366F1",
        boxShadow: "0 0 40px rgba(99,102,241,0.4)",
      },
      content: "🎡 Lucky Spin Wheel",
      binding: "wheel.spinner",
      animations: [],
    },
  },
  {
    name: "Spin Button CTA",
    category: "game_mechanics",
    icon: "fa-solid fa-rotate",
    gameType: "lucky_wheel",
    element: {
      type: "button",
      name: "Spin Wheel CTA",
      slotId: "spinButton",
      transform: {
        position: { x: 50, y: 78 },
        size: { width: 75, height: 7.5 },
        rotation: 0,
        anchor: "center",
        zIndex: 15,
        scaleMode: "stretch",
      },
      style: {
        backgroundColor: "#6366F1",
        color: "#FFFFFF",
        borderRadius: "18px",
        fontSize: "18px",
        fontWeight: "800",
        boxShadow: "0 10px 30px rgba(99,102,241,0.5)",
      },
      content: "SPIN WHEEL! 🎡",
      binding: "wheel.spinAction",
      animations: [{ trigger: "onHover", preset: "pulse", duration: 300 }],
    },
  },
  {
    name: "Scratch Card Surface",
    category: "game_mechanics",
    icon: "fa-solid fa-layer-group",
    gameType: "scratch_card",
    element: {
      type: "panel",
      name: "Scratch Card Canvas",
      slotId: "ticketArea",
      transform: {
        position: { x: 50, y: 46 },
        size: { width: 80, height: 42 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "preserve-aspect",
      },
      style: {
        backgroundColor: "#27272a",
        borderRadius: "24px",
        borderWidth: "3px",
        borderColor: "#F59E0B",
        boxShadow: "0 25px 50px rgba(0,0,0,0.8)",
      },
      content: "🪙 Rub to reveal mystery reward",
      binding: "scratch.surface",
      animations: [],
    },
  },
  {
    name: "Mystery Box Trio",
    category: "game_mechanics",
    icon: "fa-solid fa-gift",
    gameType: "mystery_box",
    element: {
      type: "panel",
      name: "Mystery Boxes Container",
      slotId: "boxesContainer",
      transform: {
        position: { x: 50, y: 52 },
        size: { width: 85, height: 35 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "preserve-aspect",
      },
      style: {
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        borderRadius: "24px",
        borderWidth: "1px",
        borderColor: "rgba(59, 130, 246, 0.3)",
      },
      content: "📦  📦  📦",
      binding: "mystery.boxes",
      animations: [],
    },
  },
  {
    name: "Reaction Target Field",
    category: "game_mechanics",
    icon: "fa-solid fa-bolt",
    gameType: "hit_it",
    element: {
      type: "panel",
      name: "Target Action Field",
      slotId: "hitTargetArea",
      transform: {
        position: { x: 50, y: 50 },
        size: { width: 85, height: 50 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "preserve-aspect",
      },
      style: {
        backgroundColor: "rgba(239, 68, 68, 0.05)",
        borderRadius: "24px",
        borderWidth: "1px",
        borderColor: "rgba(239, 68, 68, 0.25)",
      },
      content: "🎯 Tap the target quickly!",
      binding: "hitit.targetArea",
      animations: [],
    },
  },
  {
    name: "Trivia Question Card",
    category: "game_mechanics",
    icon: "fa-solid fa-circle-question",
    gameType: "quiz",
    element: {
      type: "panel",
      name: "Question Prompt Card",
      slotId: "questionPanel",
      transform: {
        position: { x: 50, y: 48 },
        size: { width: 85, height: 46 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "stretch",
      },
      style: {
        backgroundColor: "#1e1b4b",
        borderRadius: "24px",
        borderWidth: "1px",
        borderColor: "#6366F1",
        boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
      },
      content: "💡 Question & 4 Multiple Choice Answers",
      binding: "quiz.question",
      animations: [],
    },
  },

  // Buttons
  {
    name: "Primary Neon CTA",
    category: "buttons",
    icon: "fa-solid fa-gamepad",
    gameType: "all",
    element: {
      type: "button",
      name: "Primary Action CTA",
      transform: {
        position: { x: 50, y: 78 },
        size: { width: 75, height: 7.5 },
        rotation: 0,
        anchor: "center",
        zIndex: 15,
        scaleMode: "stretch",
      },
      style: {
        backgroundColor: "#6366F1",
        color: "#FFFFFF",
        borderRadius: "18px",
        fontSize: "18px",
        fontWeight: "800",
        boxShadow: "0 10px 25px rgba(99,102,241,0.5)",
      },
      content: "PLAY NOW 🚀",
      animations: [{ trigger: "onHover", preset: "popIn", duration: 200 }],
    },
  },
  {
    name: "Secondary Glass Button",
    category: "buttons",
    icon: "fa-regular fa-square-check",
    gameType: "all",
    element: {
      type: "button",
      name: "Secondary Glass Button",
      transform: {
        position: { x: 50, y: 88 },
        size: { width: 60, height: 6 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "stretch",
      },
      style: {
        backgroundColor: "rgba(255,255,255,0.08)",
        color: "#E2E8F0",
        borderRadius: "14px",
        fontSize: "14px",
        fontWeight: "600",
        borderWidth: "1px",
        borderColor: "rgba(255,255,255,0.15)",
      },
      content: "HOW TO PLAY",
      animations: [],
    },
  },

  // HUD
  {
    name: "Countdown Timer Bar",
    category: "hud",
    icon: "fa-solid fa-stopwatch",
    gameType: "all",
    element: {
      type: "progressBar",
      name: "Round Timer",
      transform: {
        position: { x: 50, y: 8 },
        size: { width: 65, height: 2.5 },
        rotation: 0,
        anchor: "center",
        zIndex: 20,
        scaleMode: "stretch",
      },
      style: {
        backgroundColor: "#1E293B",
        color: "#38BDF8",
        borderRadius: "9999px",
      },
      content: "30",
      binding: "game.timer",
      animations: [],
    },
  },
  {
    name: "Arcade Score Counter",
    category: "hud",
    icon: "fa-solid fa-trophy",
    gameType: "all",
    element: {
      type: "text",
      name: "Score Counter",
      transform: {
        position: { x: 86, y: 4 },
        size: { width: 14, height: 4 },
        rotation: 0,
        anchor: "topRight",
        zIndex: 20,
        scaleMode: "preserve-aspect",
      },
      style: {
        color: "#FACC15",
        fontSize: "20px",
        fontWeight: "900",
        textAlign: "right",
        textShadow: "0 0 15px rgba(250,204,21,0.6)",
      },
      content: "000000",
      binding: "player.score",
      animations: [
        {
          trigger: "onGameEvent",
          gameEvent: "scoreIncrease",
          preset: "bounce",
          duration: 300,
        },
      ],
    },
  },

  // Typography
  {
    name: "Neon Title Headline",
    category: "typography",
    icon: "fa-solid fa-heading",
    gameType: "all",
    element: {
      type: "text",
      name: "Neon Title",
      transform: {
        position: { x: 50, y: 24 },
        size: { width: 80, height: 10 },
        rotation: 0,
        anchor: "center",
        zIndex: 5,
        scaleMode: "stretch",
      },
      style: {
        color: "#FFFFFF",
        fontSize: "32px",
        fontWeight: "900",
        textAlign: "center",
        textShadow: "0 0 25px rgba(99,102,241,0.7)",
      },
      content: "LUCKY CAMPAIGN",
      animations: [{ trigger: "onMount", preset: "popIn", duration: 500 }],
    },
  },
  {
    name: "Subtitle Description",
    category: "typography",
    icon: "fa-solid fa-align-left",
    gameType: "all",
    element: {
      type: "text",
      name: "Subtitle",
      transform: {
        position: { x: 50, y: 34 },
        size: { width: 70, height: 5 },
        rotation: 0,
        anchor: "center",
        zIndex: 5,
        scaleMode: "stretch",
      },
      style: {
        color: "#94A3B8",
        fontSize: "15px",
        fontWeight: "500",
        textAlign: "center",
      },
      content: "Participate and win exclusive gifts & vouchers.",
      animations: [
        { trigger: "onMount", preset: "fadeIn", duration: 400, delay: 200 },
      ],
    },
  },

  // Visuals & Avatars
  {
    name: "Glow Avatar Badge",
    category: "visuals",
    icon: "fa-solid fa-circle-user",
    gameType: "all",
    element: {
      type: "avatar",
      name: "Player Badge",
      transform: {
        position: { x: 50, y: 50 },
        size: { width: 14, height: 14 },
        rotation: 0,
        anchor: "center",
        zIndex: 10,
        scaleMode: "preserve-aspect",
      },
      style: {
        borderRadius: "9999px",
        borderWidth: "3px",
        borderColor: "#EC4899",
        boxShadow: "0 0 25px rgba(236,72,153,0.6)",
      },
      content:
        "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
      binding: "player.avatar",
      animations: [
        { trigger: "onMount", preset: "pulse", duration: 2000, loop: true },
      ],
    },
  },
];

export const PresetsPanel: React.FC = () => {
  const { project } = useEditorStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const currentGameType = project.templateId || "lucky_wheel";

  const filteredPresets = PRESET_LIBRARY.filter((preset) => {
    // Filter by game type matching or generic
    const matchesGame =
      preset.gameType === "all" ||
      preset.gameType === currentGameType ||
      !preset.gameType;

    if (!matchesGame) return false;
    if (selectedCategory === "all") return true;
    return preset.category === selectedCategory;
  });

  const handleDragStart = (e: React.DragEvent, preset: PresetItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(preset.element));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="p-3 space-y-3">
      {/* Category filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-semibold text-slate-400 custom-scrollbar">
        {[
          { id: "all", label: "All" },
          { id: "game_mechanics", label: "Mechanics" },
          { id: "buttons", label: "Buttons" },
          { id: "hud", label: "HUD" },
          { id: "typography", label: "Text" },
          { id: "visuals", label: "Visuals" },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
              selectedCategory === cat.id
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 hover:text-white"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <i className="fa-solid fa-cubes-stacked text-indigo-400" />
          <span>Presets (Drag to Screen)</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {filteredPresets.length} items
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {filteredPresets.map((preset, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) => handleDragStart(e, preset)}
            className="group flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 cursor-grab active:cursor-grabbing transition-all shadow-sm select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 group-hover:scale-105 transition-transform shrink-0">
              <i className={preset.icon} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-white truncate">
                {preset.name}
              </div>
              <div className="text-[10px] text-slate-500 capitalize">
                {preset.category.replace("_", " ")}
              </div>
            </div>

            <i className="fa-solid fa-grip-lines text-slate-600 text-xs group-hover:text-slate-400" />
          </div>
        ))}
      </div>
    </div>
  );
};
