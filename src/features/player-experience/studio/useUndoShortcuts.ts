import { useEffect } from "react";
import { useStudioContext } from "./StudioContext";

// Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (⌘ on a Mac) walk the configuration history. Inside a text
// field, the browser's own undo of that field wins: the brand is correcting what they type,
// not asking to revert the last Studio edit.
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    return !["checkbox", "radio", "range", "color", "button"].includes(
      target.type,
    );
  }
  return false;
}

export function useUndoShortcuts(): void {
  const { store } = useStudioContext();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (isTextEntry(event.target)) return;
      const key = event.key.toLowerCase();
      const history = store.temporal.getState();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        history.undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        history.redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [store]);
}
