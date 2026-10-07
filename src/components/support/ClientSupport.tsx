// Client support (sidebar, above the documentation): the client opens a ticket about a problem
// with the platform, and finds the history of its tickets and where each one stands.
import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LifeBuoy,
  Plus,
  Search,
  X,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { useSupportTickets } from "../../hooks/useSupportTickets";
import { formatTicketNumber, SUPPORT_STATES } from "../../lib/support";
import type { SupportTicket, SupportTicketState } from "../../types";
import { Button } from "../ui/button";
import { DataTable } from "../ui/data-table";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/native-select";
import {
  NewSupportTicketDialog,
  type SupportAccount,
} from "./NewSupportTicketDialog";
import { SupportTicketDetailDialog } from "./SupportTicketDetailDialog";
import {
  matchesSupportSearch,
  supportTicketColumns,
} from "./supportTicketColumns";

type StateFilter = SupportTicketState | "all";

function StateCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {children}
    </div>
  );
}

export function ClientSupport() {
  const { organization, profile } = useAuth();
  const orgId = organization?.id ?? null;
  const { tickets, loading, error, refetch } = useSupportTickets(orgId);

  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<SupportTicket | null>(null);
  const [created, setCreated] = useState<SupportTicket | null>(null);

  const account: SupportAccount = {
    email: profile?.email ?? organization?.contact_email ?? "",
    clientId: orgId ?? "",
    plan: organization?.plan ?? "free",
    phoneNumber: organization?.phone_number ?? null,
  };

  const columns = useMemo(
    () => supportTicketColumns({ onOpen: setViewing }),
    [],
  );
  const columnFilters = useMemo(
    () => (stateFilter === "all" ? [] : [{ id: "state", value: stateFilter }]),
    [stateFilter],
  );

  const filtered = query.trim() !== "" || stateFilter !== "all";
  const clearFilters = () => {
    setQuery("");
    setStateFilter("all");
  };

  const counter = loading
    ? "Loading…"
    : `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`;

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 pb-16 text-brand-text">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-brand-text">
            Client support
          </h2>
          <p className="mt-0.5 text-xs font-medium text-brand-text-muted">
            Report a problem with the platform and follow your tickets.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreated(null);
            setCreating(true);
          }}
          disabled={!orgId}
        >
          <Plus aria-hidden />
          Open new support ticket
        </Button>
      </header>

      {created && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Ticket <strong>{formatTicketNumber(created.ticketNumber)}</strong>{" "}
              sent. We will answer at {created.contactEmail}.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setCreated(null)}
            aria-label="Dismiss"
            className="cursor-pointer rounded-md p-1 hover:bg-emerald-500/10"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {error && !loading ? (
        <div className="rounded-xl border border-border bg-background">
          <StateCard>
            <AlertTriangle className="size-6 text-amber-500" aria-hidden />
            <p className="font-semibold text-foreground">{error}</p>
            <Button variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </StateCard>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tickets…"
                aria-label="Search tickets"
                className="border-border/50 bg-transparent pl-9 shadow-none focus-visible:ring-1"
              />
            </div>
            <div className="w-full sm:w-44">
              <NativeSelect
                aria-label="Filter by state"
                value={stateFilter}
                onChange={(event) =>
                  setStateFilter(event.target.value as StateFilter)
                }
                className="border-border/50 bg-card-bg shadow-none"
              >
                <option value="all">All states</option>
                {SUPPORT_STATES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <p
              className="ml-auto text-xs text-muted-foreground"
              aria-live="polite"
            >
              {counter}
            </p>
          </div>

          <DataTable<SupportTicket>
            columns={columns}
            data={tickets}
            ariaLabel="Your support tickets"
            getRowId={(ticket) => ticket.id}
            onRowOpen={setViewing}
            globalFilter={query}
            globalFilterFn={matchesSupportSearch}
            columnFilters={columnFilters}
            initialSorting={[{ id: "created", desc: true }]}
            loading={loading}
            hiddenColumnsBelow={{
              type: "md",
              comments: "lg",
              description: "xl",
              created: "sm",
            }}
            emptyState={
              <StateCard>
                <LifeBuoy
                  className="size-8 text-muted-foreground"
                  aria-hidden
                />
                <p className="font-semibold text-foreground">
                  No support tickets yet
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Something wrong with the platform? Open a ticket and we will
                  look into it.
                </p>
                <Button
                  onClick={() => {
                    setCreated(null);
                    setCreating(true);
                  }}
                  disabled={!orgId}
                >
                  <Plus aria-hidden />
                  Open new support ticket
                </Button>
              </StateCard>
            }
            noResultsState={
              <StateCard>
                <p className="font-semibold text-foreground">
                  No ticket matches your filters
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              </StateCard>
            }
          />
          {filtered && !loading && tickets.length > 0 && (
            <p className="sr-only" aria-live="polite">
              Filters applied
            </p>
          )}
        </>
      )}

      <NewSupportTicketDialog
        open={creating}
        onOpenChange={setCreating}
        account={account}
        onCreated={(ticket) => {
          setCreated(ticket);
          void refetch();
        }}
      />
      <SupportTicketDetailDialog
        ticket={viewing}
        onClose={() => setViewing(null)}
        // A comment is one more on the ticket: the history shows the new count.
        onCommentPosted={() => void refetch()}
      />
    </div>
  );
}
