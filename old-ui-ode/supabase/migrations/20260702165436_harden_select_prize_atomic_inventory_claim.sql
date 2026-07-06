-- Atomically claims one inventory row for a prize under concurrent load.
-- The SKIP LOCKED pattern prevents workers from blocking each other and
-- guarantees we never decrement below zero.
CREATE OR REPLACE FUNCTION public.claim_prize_inventory(
  p_prize_id uuid
)
RETURNS TABLE (inventory_id uuid)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT pi.id
    FROM public.prize_inventory pi
    WHERE pi.prize_id = p_prize_id
      AND pi.remaining > 0
    ORDER BY pi.created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.prize_inventory pi
    SET
      remaining = pi.remaining - 1,
      claimed = pi.claimed + 1
    FROM target
    WHERE pi.id = target.id
    RETURNING pi.id
  )
  SELECT updated.id
  FROM updated;
END;
$$;

-- Keep winner counters accurate with an atomic increment operation.
CREATE OR REPLACE FUNCTION public.increment_prize_winner_count(
  p_prize_id uuid
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.prizes
  SET quantity_won = quantity_won + 1
  WHERE id = p_prize_id;
$$;