import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { toFriendlyErrorMessage } from "../lib/errorMessages";

export interface BillingRecord {
  id: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  billing_cycle: "monthly" | "yearly" | "one_time";
  amount: number | string;
  status: "pending" | "paid" | "failed" | "refunded";
  period_start: string;
  period_end: string;
}

export function useBilling(organizationId: string | null | undefined) {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    if (!organizationId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("billing")
        .select(
          "id, plan, billing_cycle, amount, status, period_start, period_end",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;
      setRecords((data as BillingRecord[]) ?? []);
    } catch (err) {
      setError(toFriendlyErrorMessage(err, "Unable to load billing data."));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchBilling();
  }, [fetchBilling]);

  return { records, loading, error, refetch: fetchBilling };
}
