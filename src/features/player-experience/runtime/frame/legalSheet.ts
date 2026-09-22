import { createContext, useContext } from "react";

// Opens the legal sheet of the frame from inside a slot: the consent of the registration
// form links to the rules (plan §6.2). The trigger gets the focus back when it closes.
export const LegalSheetContext = createContext<
  ((trigger: HTMLElement) => void) | null
>(null);

export function useOpenLegalSheet(): ((trigger: HTMLElement) => void) | null {
  return useContext(LegalSheetContext);
}
