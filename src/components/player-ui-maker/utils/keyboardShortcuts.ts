import { useEffect } from "react";
import { useEditorStore } from "../store/useEditorStore";
import { canDrag } from "./transformUtils";

export function useEditorKeyboardShortcuts() {
  const {
    activeScreen,
    selectedIds,
    project,
    updateElementTransform,
    deleteElements,
    duplicateElements,
    copySelection,
    pasteSelection,
    clearSelection,
  } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest(".react-colorful")
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl/Cmd + Z
      if (modKey && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.temporal.getState().undo();
        return;
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if (
        (modKey && e.shiftKey && e.key.toLowerCase() === "z") ||
        (modKey && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        useEditorStore.temporal.getState().redo();
        return;
      }

      // Duplicate: Ctrl/Cmd + D
      if (modKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateElements(activeScreen);
        return;
      }

      // Copy: Ctrl/Cmd + C
      if (modKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelection();
        return;
      }

      // Paste: Ctrl/Cmd + V
      if (modKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteSelection();
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteElements(activeScreen);
        }
        return;
      }

      // Escape: Deselect all
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Arrow Nudging (reuses same lock check canDrag(element))
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        if (selectedIds.length === 0) return;

        const screen = project.screens[activeScreen];
        if (!screen) return;

        e.preventDefault();
        const step = e.shiftKey ? 2.5 : 0.5;

        selectedIds.forEach((id) => {
          const el = screen.elements.find((item) => item.id === id);
          if (!el) return;

          // Crucial: Reuse same lock check
          if (!canDrag(el)) return;

          let { x, y } = el.transform.position;
          if (e.key === "ArrowLeft") x = Math.max(0, x - step);
          if (e.key === "ArrowRight") x = Math.min(100, x + step);
          if (e.key === "ArrowUp") y = Math.max(0, y - step);
          if (e.key === "ArrowDown") y = Math.min(100, y + step);

          updateElementTransform(activeScreen, el.id, {
            position: {
              x: Number(x.toFixed(2)),
              y: Number(y.toFixed(2)),
            },
          });
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeScreen,
    selectedIds,
    project,
    updateElementTransform,
    deleteElements,
    duplicateElements,
    copySelection,
    pasteSelection,
    clearSelection,
  ]);
}
