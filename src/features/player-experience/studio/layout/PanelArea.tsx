import { useRef, type ComponentType } from "react";
import { BrandPanel } from "../panels/BrandPanel";
import { LegalPanel } from "../panels/LegalPanel";
import { SharePanel } from "../panels/SharePanel";
import { ValidationPanel } from "../validation/ValidationPanel";
import { SectionsPanel } from "../panels/SectionsPanel";
import { TemplatePanel } from "../panels/TemplatePanel";
import type { StudioPanel } from "../store";
import { useStudio } from "../StudioContext";
import { useRevealFocusPath } from "../useRevealFocusPath";
import { PANEL_META } from "./StudioNav";

// The settings panel of the selected section (T6.4 to T6.7).
const PANELS: Partial<Record<StudioPanel, ComponentType>> = {
  template: TemplatePanel,
  brand: BrandPanel,
  sections: SectionsPanel,
  legal: LegalPanel,
  share: SharePanel,
  validation: ValidationPanel,
};

export function PanelArea() {
  const panel = useStudio((state) => state.ui.panel);
  const container = useRef<HTMLDivElement>(null);
  useRevealFocusPath(container);
  const Panel = PANELS[panel];
  const { label, hint } = PANEL_META[panel];

  if (Panel) {
    return (
      <div ref={container} key={panel}>
        <Panel />
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
      <div>
        <h2 className="text-base font-bold">{label}</h2>
        <p className="mt-1 text-sm text-brand-text-muted">{hint}</p>
      </div>
      <p className="text-xs font-semibold text-brand-text-muted">
        These settings are not available yet.
      </p>
    </div>
  );
}
