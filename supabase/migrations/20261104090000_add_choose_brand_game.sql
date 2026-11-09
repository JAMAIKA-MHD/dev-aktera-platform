-- A new game: choose_brand (Choose Your Brand).
--
-- The player picks the left or the right picture of each round, then the prize draw runs.
-- No pick is right or wrong: resolve_game_outcome needs no change, its final ELSE already
-- draws for a game without a score (like the wheel, the scratch card and the boxes).
-- The picks themselves are kept by select-prize in entries.metadata.brand_choices.
-- Idempotent: safe to run twice.

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_game_type_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_game_type_check
  CHECK (game_type IN (
    'lucky_wheel', 'quiz', 'scratch_card', 'mystery_box', 'hit_it',
    'memory_match', 'choose_brand'
  ));
