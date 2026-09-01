import React from "react";
import { LayoutTemplate, PlayCircle, Trophy, XCircle } from "lucide-react";

export type EditorScreenType = "pre-game" | "game" | "win" | "lose";

interface PlayerEditorLeftNavProps {
  activeScreen: EditorScreenType;
  onChangeScreen: (screen: EditorScreenType) => void;
}

export function PlayerEditorLeftNav({
  activeScreen,
  onChangeScreen,
}: PlayerEditorLeftNavProps) {
  const screens = [
    {
      id: "pre-game" as EditorScreenType,
      label: "Pre-Game Screen",
      icon: LayoutTemplate,
    },
    { id: "game" as EditorScreenType, label: "Game Screen", icon: PlayCircle },
    { id: "win" as EditorScreenType, label: "Winner Screen", icon: Trophy },
    {
      id: "lose" as EditorScreenType,
      label: "Non-Winner Screen",
      icon: XCircle,
    },
  ];

  return (
    <div className="w-60 bg-brand-dark border-r border-brand-border flex flex-col h-full shrink-0">
      {/* Navigation list */}
      <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
        <div className="text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2 px-2">
          Player Flow
        </div>

        {screens.map((screen) => {
          const isActive = activeScreen === screen.id;
          const Icon = screen.icon;

          return (
            <button
              key={screen.id}
              onClick={() => onChangeScreen(screen.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left border-l-2 ${
                isActive
                  ? "bg-brand-surface border-brand-primary text-brand-text shadow-sm"
                  : "border-transparent text-brand-text-muted hover:bg-brand-surface/50 hover:text-brand-text"
              }`}
            >
              <Icon className="w-4 h-4 opacity-80" />
              <span>{screen.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
