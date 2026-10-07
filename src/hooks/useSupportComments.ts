import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { mapSupportComment, type DbSupportCommentRow } from "../lib/support";
import { SupportTicketComment } from "../types";

/**
 * The thread of a support ticket, oldest comment first (RLS shows only the comments of the
 * tickets of the caller's organization). Nothing is read while no ticket is open.
 */
export function useSupportComments(ticketId: string | null) {
  const [comments, setComments] = useState<SupportTicketComment[]>([]);
  const [loading, setLoading] = useState(ticketId !== null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!ticketId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("support_ticket_comments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (queryError) throw queryError;
      setComments(
        ((data ?? []) as DbSupportCommentRow[]).map(mapSupportComment),
      );
    } catch (err) {
      setError("Failed to load the comments.");
      console.error("[useSupportComments]", err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { comments, loading, error, refetch: fetchData };
}
