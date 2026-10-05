import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { severityLabel, stateLabel } from "../../lib/support";
import type { SupportSeverity, SupportTicketState } from "../../types";

// The colors say how pressing a ticket is (severity) and where it stands (state). The text is
// always there too: a color is never the only thing that tells them apart.

const SEVERITY_STYLE: Record<SupportSeverity, string> = {
  low: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  urgent: "bg-red-500/10 text-red-600 dark:text-red-300",
};

const STATE_STYLE: Record<SupportTicketState, string> = {
  new: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  open: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  on_hold: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  cancelled: "bg-slate-500/10 text-slate-500 dark:text-slate-400",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
};

const BADGE = "border-transparent font-semibold";

export function SeverityBadge({ severity }: { severity: SupportSeverity }) {
  return (
    <Badge
      variant="outline"
      className={cn(BADGE, SEVERITY_STYLE[severity])}
      data-severity={severity}
    >
      {severityLabel(severity)}
    </Badge>
  );
}

export function StateBadge({ state }: { state: SupportTicketState }) {
  return (
    <Badge
      variant="outline"
      className={cn(BADGE, STATE_STYLE[state])}
      data-state={state}
    >
      {stateLabel(state)}
    </Badge>
  );
}
