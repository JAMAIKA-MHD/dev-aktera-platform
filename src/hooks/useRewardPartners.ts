import { useCallback, useEffect, useState } from "react";
import {
  createPartner,
  deletePartner,
  fetchPartners,
} from "../services/partnerService";
import type { RewardPartner, RewardPartnerInput } from "../types";

// The partners the brand registered. add/remove throw an Error with a readable message so the
// form can show it; the list is kept in step without a reload.
export function useRewardPartners(organizationId: string | null) {
  const [partners, setPartners] = useState<RewardPartner[]>([]);
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setPartners([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPartners(await fetchPartners(organizationId));
    } catch {
      setError("We could not load your partners. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(
    async (input: RewardPartnerInput) => {
      if (!organizationId) throw new Error("Your organization is not loaded.");
      const created = await createPartner(organizationId, input);
      setPartners((current) => [...current, created]);
      return created;
    },
    [organizationId],
  );

  const remove = useCallback(async (id: string) => {
    await deletePartner(id);
    setPartners((current) => current.filter((p) => p.id !== id));
  }, []);

  return { partners, loading, error, reload: load, add, remove };
}
