import {
  FileText,
  Gamepad2,
  LayoutTemplate,
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

// The eight sections of the Studio (plan §9.2). A vertical menu beside the panel on a wide
// screen, a scrollable row of tabs above it on a narrow one. Each entry shows how many design
// issues point into it, so the brand sees where the work is.

export const PANEL_META: Readonly<
  Record<StudioPanel, { label: string; icon: LucideIcon; hint: string }>
> = {
  template: { label: "Template", icon: LayoutTemplate, hint: "Starting style" },
  brand: { label: "Brand", icon: Palette, hint: "Logo, colors, background" },
  content: { label: "Content", icon: Type, hint: "Texts of each screen" },
  sections: {
    label: "Sections",
    icon: SquareStack,
    hint: "Jackpot card, prize chips",
  },
  form: { label: "Form", icon: FileText, hint: "Fields and consent" },
  game: { label: "Game", icon: Gamepad2, hint: "How the game looks" },
  legal: { label: "Legal", icon: Scale, hint: "Organizer, links, terms" },
  share: { label: "Share", icon: Share2, hint: "Export, import, reset" },
};

export function StudioNav() {
  const active = useStudio((state) => state.ui.panel);
  const setPanel = useStudio((state) => state.setPanel);
  const issues = useStudio((state) => state.issues);

  const counts = useMemo(() => {
    const byPanel = new Map<StudioPanel, { errors: number; total: number }>();
    for (const issue of issues) {
      const panel = panelForPath(issue.path);
      if (!panel) continue;
      const count = byPanel.get(panel) ?? { errors: 0, total: 0 };
      count.total += 1;
      if (issue.level === "error") count.errors += 1;
      byPanel.set(panel, count);
    }
    return byPanel;
  }, [issues]);

  return (
    <nav
      aria-label="Studio sections"
      className="shrink-0 border-b border-card-border bg-card-bg lg:w-52 lg:border-b-0 lg:border-r"
    >
      <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible lg:p-3">
        {STUDIO_PANELS.map((panel) => {
          const { label, icon: Icon, hint } = PANEL_META[panel];
          const selected = panel === active;
          const count = counts.get(panel);
          return (
            <li key={panel} className="shrink-0">
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
                {count && (
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
        })}
      </ul>
    </nav>
  );
}
