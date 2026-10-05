import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { mapSupportTicket, type DbSupportTicketRow } from "../lib/support";
import { SupportTicket } from "../types";

// ── Hook ────────────────────────────────────────────────────────────────────

/** The support tickets of an organization, newest first (RLS shows no other organization's). */
export function useSupportTickets(organizationId: string | null) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!organizationId) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      setTickets(((data ?? []) as DbSupportTicketRow[]).map(mapSupportTicket));
    } catch (err) {
      setError("Failed to load your support tickets.");
      console.error("[useSupportTickets]", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { tickets, loading, error, refetch: fetchData };
}
