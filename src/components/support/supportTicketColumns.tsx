// Columns of the support tickets table (DataTable, src/components/ui/data-table.tsx).
import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { ArrowRight, MessageSquare } from "lucide-react";

import { formatTicketNumber, sectionLabel, typeLabel } from "../../lib/support";
import type { SupportSeverity, SupportTicket } from "../../types";
import { Button } from "../ui/button";
import { SeverityBadge, StateBadge } from "./SupportBadges";

// Urgent first when sorted from the most pressing.
const SEVERITY_RANK: Record<SupportSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

export function formatTicketDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "05 Oct 2026, 14:32": when a comment was written. */
export function formatTicketDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The words a search can find in a ticket: its reference, the choices made, and what was said.
export const matchesSupportSearch: FilterFn<SupportTicket> = (
  row,
  _columnId,
  value,
) => {
  const needle = String(value).trim().toLowerCase();
  if (!needle) return true;
  const ticket = row.original;
  return [
    formatTicketNumber(ticket.ticketNumber),
    String(ticket.ticketNumber),
    sectionLabel(ticket.platformSection),
    typeLabel(ticket.type),
    ticket.severity,
    ticket.state.replace("_", " "),
    ticket.description,
  ].some((text) => text.toLowerCase().includes(needle));
};

export function supportTicketColumns({
  onOpen,
}: {
  onOpen: (ticket: SupportTicket) => void;
}): ColumnDef<SupportTicket, unknown>[] {
  return [
    {
      id: "ticket",
      accessorKey: "ticketNumber",
      header: "Ticket",
      sortingFn: "basic",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatTicketNumber(row.original.ticketNumber)}
        </span>
      ),
    },
    {
      id: "section",
      accessorFn: (ticket) => sectionLabel(ticket.platformSection),
      header: "Platform section",
      sortingFn: "text",
      cell: ({ row }) => (
        <span className="text-foreground">
          {sectionLabel(row.original.platformSection)}
        </span>
      ),
    },
    {
      id: "type",
      accessorFn: (ticket) => typeLabel(ticket.type),
      header: "Type",
      sortingFn: "text",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {typeLabel(row.original.type)}
        </span>
      ),
    },
    {
      id: "severity",
      accessorFn: (ticket) => SEVERITY_RANK[ticket.severity],
      header: "Severity",
      sortingFn: "basic",
      cell: ({ row }) => <SeverityBadge severity={row.original.severity} />,
    },
    {
      id: "state",
      accessorKey: "state",
      header: "State",
      enableSorting: false,
      filterFn: (row, _columnId, value) => row.original.state === value,
      cell: ({ row }) => <StateBadge state={row.original.state} />,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      cell: ({ row }) => (
        <span
          className="block max-w-[28ch] truncate text-muted-foreground"
          title={row.original.description}
        >
          {row.original.description}
        </span>
      ),
    },
    {
      id: "comments",
      accessorKey: "commentsCount",
      header: "Comments",
      sortingFn: "basic",
      cell: ({ row }) => {
        const count = row.original.commentsCount;
        return (
          <span
            className="inline-flex items-center gap-1 tabular-nums text-muted-foreground"
            aria-label={`${count} comment${count === 1 ? "" : "s"}`}
          >
            <MessageSquare className="size-3.5" aria-hidden />
            {count}
          </span>
        );
      },
    },
    {
      id: "created",
      accessorFn: (ticket) => Date.parse(ticket.createdAt) || 0,
      header: "Opened",
      sortingFn: "basic",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatTicketDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { className: "w-px text-right" },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpen(row.original)}
          aria-label={`View ticket ${formatTicketNumber(row.original.ticketNumber)}`}
        >
          View
          <ArrowRight aria-hidden />
        </Button>
      ),
    },
  ];
}
