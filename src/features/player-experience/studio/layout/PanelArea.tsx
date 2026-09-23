import { Construction } from "lucide-react";
import type { ComponentType } from "react";
import type { StudioPanel } from "../store";
import { useStudio } from "../StudioContext";
import { PANEL_META } from "./StudioNav";

// The settings panel of the selected section. Each panel arrives with its own task
// (T6.4 to T6.7); until then, its place says so instead of staying blank.
const PANELS: Partial<Record<StudioPanel, ComponentType>> = {};

export function PanelArea() {
  const panel = useStudio((state) => state.ui.panel);
  const Panel = PANELS[panel];
  const { label, icon: Icon, hint } = PANEL_META[panel];

  if (Panel) return <Panel />;
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-card-bg text-brand-text-muted shadow-sm ring-1 ring-card-border">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <h2 className="text-base font-bold">{label}</h2>
        <p className="mt-1 text-sm text-brand-text-muted">{hint}</p>
      </div>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-text-muted">
        <Construction className="size-3.5" aria-hidden />
        These settings are not available yet.
      </p>
    </div>
  );
}
