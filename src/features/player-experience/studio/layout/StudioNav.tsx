import {
  FileText,
  Gamepad2,
  LayoutTemplate,
  ListChecks,
  Palette,
  Scale,
  Share2,
  SquareStack,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { panelForPath } from "../panelForPath";
import { STUDIO_PANELS, type StudioPanel } from "../store";
import { useStudio } from "../StudioContext";

// The eight sections of the Studio (plan §9.2), then Validation (T6.8). A vertical menu beside
// the panel on a wide screen, a scrollable row of tabs above it on a narrow one. Each entry
// shows how many issues point into it, so the brand sees where the work is.

export const PANEL_META: Readonly<
  Record<StudioPanel, { label: string; icon: LucideIcon; hint: string }>
> = {
  template: { label: "Template", icon: LayoutTemplate, hint: "Starting style" },
  brand: {
    label: "Brand Identity",
    icon: Palette,
    hint: "Logo, colors, background",
  },
  content: { label: "Content", icon: Type, hint: "Texts of each screen" },
  sections: {
    label: "Sections",
    icon: SquareStack,
    hint: "Jackpot card, prize chips",
  },
  form: { label: "Form", icon: FileText, hint: "Fields and consent" },
  game: { label: "Game", icon: Gamepad2, hint: "How the game looks" },
  legal: { label: "Legal", icon: Scale, hint: "Organizer, links, terms" },
  share: { label: "Export", icon: Share2, hint: "Export, import, reset" },
  validation: {
    label: "Validation",
    icon: ListChecks,
    hint: "What to fix before sharing",
  },
};

type Count = { errors: number; total: number };

function NavItem({
  panel,
  count,
}: {
  panel: StudioPanel;
  count: Count | undefined;
}) {
  const active = useStudio((state) => state.ui.panel);
  const setPanel = useStudio((state) => state.setPanel);
  const { label, icon: Icon, hint } = PANEL_META[panel];
  const selected = panel === active;
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={() => setPanel(panel)}
        aria-current={selected ? "page" : undefined}
        title={hint}
        className={`group flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-blue-500 ${
          selected
            ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
            : "text-brand-text-muted hover:bg-card-hover hover:text-brand-text"
        }`}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden />
        <span className="flex-1">{label}</span>
        {count && count.total > 0 && (
          <span
            className={`min-w-5 rounded-full px-1.5 text-center text-[10px] font-black leading-5 ${
              selected
                ? "bg-white/25 text-white"
                : count.errors > 0
                  ? "bg-red-500 text-white"
                  : "bg-amber-400 text-amber-950"
            }`}
            aria-label={`${count.total} issue${count.total > 1 ? "s" : ""}`}
          >
            {count.total}
          </span>
        )}
      </button>
    </li>
  );
}

export function StudioNav() {
  const issues = useStudio((state) => state.issues);
  const layoutIssues = useStudio((state) => state.layoutIssues);

  const counts = useMemo(() => {
    const byPanel = new Map<StudioPanel, Count>();
    const add = (panel: StudioPanel | null, error: boolean) => {
      if (!panel) return;
      const count = byPanel.get(panel) ?? { errors: 0, total: 0 };
      count.total += 1;
      if (error) count.errors += 1;
      byPanel.set(panel, count);
    };
    for (const issue of issues) {
      add(panelForPath(issue.path), issue.level === "error");
      add("validation", issue.level === "error");
    }
    // Layout issues of the size shown (T6.10): warnings, counted in Validation only.
    for (let index = 0; index < layoutIssues.length; index++) {
      add("validation", false);
    }
    return byPanel;
  }, [issues, layoutIssues]);

  return (
    <nav
      aria-label="Studio sections"
      className="shrink-0 border-b border-card-border bg-card-bg lg:flex lg:w-52 lg:flex-col lg:border-b-0 lg:border-r"
    >
      <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible lg:p-3">
        {STUDIO_PANELS.map((panel) => (
          <NavItem key={panel} panel={panel} count={counts.get(panel)} />
        ))}
        <li
          aria-hidden
          className="mx-1 w-px shrink-0 bg-card-border lg:mx-2 lg:my-1 lg:h-px lg:w-auto"
        />
        <NavItem panel="validation" count={counts.get("validation")} />
      </ul>
    </nav>
  );
}
