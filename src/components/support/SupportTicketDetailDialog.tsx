// One ticket of the history: what was reported, the account details it was sent with (as they
// were when it was opened), and its conversation, where the client can comment while it is open.
import { useCallback, useState, type ReactNode } from "react";

import {
  formatTicketNumber,
  planLabel,
  sectionLabel,
  typeLabel,
} from "../../lib/support";
import type { SupportTicket } from "../../types";
import { Dialog } from "../ui/dialog";
import { formatTicketDate } from "./supportTicketColumns";
import { SeverityBadge, StateBadge } from "./SupportBadges";
import { SupportComments } from "./SupportComments";

function Item({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function SupportTicketDetailDialog({
  ticket,
  onClose,
  onCommentPosted,
}: {
  ticket: SupportTicket | null;
  onClose: () => void;
  /** A comment was added to the ticket. */
  onCommentPosted?: () => void;
}) {
  // A comment written and not sent: closing the window by mistake (Escape, a click beside it)
  // must not throw it away without asking.
  const [draftDirty, setDraftDirty] = useState(false);
  const requestClose = () => {
    if (draftDirty && !window.confirm("Discard your unsent comment?")) return;
    onClose();
  };
  const trackDraft = useCallback((dirty: boolean) => setDraftDirty(dirty), []);

  return (
    <Dialog
      open={ticket !== null}
      onOpenChange={(open) => !open && requestClose()}
      title={
        ticket ? `Ticket ${formatTicketNumber(ticket.ticketNumber)}` : "Ticket"
      }
      description={
        ticket ? `Opened on ${formatTicketDate(ticket.createdAt)}` : undefined
      }
      className="max-w-xl"
    >
      {ticket && (
        <div className="space-y-4">
          <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <Item term="State">
              <StateBadge state={ticket.state} />
            </Item>
            <Item term="Severity">
              <SeverityBadge severity={ticket.severity} />
            </Item>
            <Item term="Platform section">
              {sectionLabel(ticket.platformSection)}
            </Item>
            <Item term="Type">{typeLabel(ticket.type)}</Item>
            {ticket.resolvedAt && (
              <Item term="Resolved on">
                {formatTicketDate(ticket.resolvedAt)}
              </Item>
            )}
          </dl>

          <section className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description
            </h3>
            <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted p-3 text-sm text-foreground">
              {ticket.description}
            </p>
          </section>

          <SupportComments
            // One thread per ticket: another ticket starts from its own comments and draft.
            key={ticket.id}
            ticket={ticket}
            onPosted={onCommentPosted}
            onDirtyChange={trackDraft}
          />

          <section
            aria-label="Account details"
            className="space-y-2 rounded-xl border border-border bg-muted p-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Account details
            </h3>
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <Item term="Email">{ticket.contactEmail}</Item>
              <Item term="Client ID">
                <span className="break-all font-mono text-xs">
                  {ticket.organizationId}
                </span>
              </Item>
              <Item term="Plan">{planLabel(ticket.plan)}</Item>
              <Item term="Phone number">
                {ticket.contactPhone ?? (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </Item>
            </dl>
          </section>
        </div>
      )}
    </Dialog>
  );
}
