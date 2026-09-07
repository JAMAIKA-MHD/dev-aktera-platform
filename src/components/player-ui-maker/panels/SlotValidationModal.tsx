import React from "react";
import { useEditorStore } from "../store/useEditorStore";
import { getGameTemplateById } from "../templates/defaultGameTemplates";
import { validateSlots, ScreenId, SlotValidationError } from "../types";

interface SlotValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlotValidationModal: React.FC<SlotValidationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { project, setActiveScreen, addElement } = useEditorStore();

  if (!isOpen) return null;

  const template = getGameTemplateById(project.templateId);
  const screens: ScreenId[] = ["pregame", "game", "lose", "win"];

  const allErrors: SlotValidationError[] = [];
  const screenErrorMap: Record<ScreenId, SlotValidationError[]> = {
    pregame: [],
    game: [],
    lose: [],
    win: [],
  };

  screens.forEach((sId) => {
    const screen = project.screens[sId];
    if (screen) {
      const errs = validateSlots(screen, template);
      screenErrorMap[sId] = errs;
      allErrors.push(...errs);
    }
  });

  const totalErrors = allErrors.filter((e) => e.severity === "error").length;
  const totalWarnings = allErrors.filter(
    (e) => e.severity === "warning",
  ).length;

  const handleAutoInsertSlot = (screenId: ScreenId, slotId: string) => {
    const slotDef = template.slots.find((s) => s.slotId === slotId);
    if (!slotDef) return;

    const newEl = {
      id: `slot-${slotDef.slotId}-${Date.now()}`,
      type: slotDef.allowedTypes[0] || "button",
      name: slotDef.label,
      slotId: slotDef.slotId,
      locked: false,
      lockedFields: slotDef.lockedFields,
      transform: slotDef.defaultTransform,
      style: {
        backgroundColor: "#6366F1",
        color: "#FFFFFF",
        borderRadius: "12px",
        fontSize: "16px",
        fontWeight: "700",
      },
      content: slotDef.label,
      binding: slotDef.binding,
      animations: [],
    };

    addElement(screenId, newEl);
    setActiveScreen(screenId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                totalErrors > 0
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              <i
                className={
                  totalErrors > 0
                    ? "fa-solid fa-triangle-exclamation"
                    : "fa-solid fa-circle-check"
                }
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Game Slot Contract Validation
              </h2>
              <p className="text-xs text-slate-400">
                Template:{" "}
                <span className="text-indigo-300 font-semibold">
                  {template.name}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Status Summary Banner */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              {totalErrors} Errors
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              {totalWarnings} Warnings
            </span>
          </div>

          <span className="text-slate-500">
            {totalErrors === 0
              ? "✅ Ready for Export"
              : "❌ Export Blocked until resolved"}
          </span>
        </div>

        {/* Screen Breakdown */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {screens.map((sId) => {
            const screen = project.screens[sId];
            const errors = screenErrorMap[sId] || [];
            const requiredSlots = template.slots.filter((slot) =>
              slot.requiredOnScreens.includes(sId),
            );

            return (
              <div
                key={sId}
                className={`p-4 rounded-xl border ${
                  errors.some((e) => e.severity === "error")
                    ? "bg-red-950/10 border-red-500/30"
                    : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white capitalize">
                      {screen?.label || sId} Screen
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                      {sId}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveScreen(sId);
                      onClose();
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    Edit Screen{" "}
                    <i className="fa-solid fa-arrow-right text-[10px]" />
                  </button>
                </div>

                {/* Required Slots List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Required Slots ({requiredSlots.length})
                  </span>

                  {requiredSlots.map((slot) => {
                    const isFitted = screen.elements.some(
                      (e) =>
                        (e.slotId && e.slotId === slot.slotId) ||
                        (e.binding && e.binding === slot.binding),
                    );

                    return (
                      <div
                        key={slot.slotId}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <i
                            className={`${
                              isFitted
                                ? "fa-solid fa-circle-check text-emerald-400"
                                : "fa-solid fa-circle-xmark text-red-400"
                            }`}
                          />
                          <div>
                            <span className="font-semibold text-slate-200">
                              {slot.label}
                            </span>
                            <span className="text-slate-500 ml-2 font-mono text-[10px]">
                              binding: {slot.binding}
                            </span>
                          </div>
                        </div>

                        {!isFitted && (
                          <button
                            onClick={() =>
                              handleAutoInsertSlot(sId, slot.slotId)
                            }
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shadow-sm flex items-center gap-1"
                          >
                            <i className="fa-solid fa-plus text-[10px]" />
                            Insert Default Slot
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Errors display */}
                {errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-1">
                    {errors.map((err, i) => (
                      <p
                        key={i}
                        className={`text-xs ${
                          err.severity === "error"
                            ? "text-red-400"
                            : "text-amber-400"
                        }`}
                      >
                        • {err.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
