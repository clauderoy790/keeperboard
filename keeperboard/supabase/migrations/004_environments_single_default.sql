-- Migration 004: Ensure only one default environment per game

CREATE UNIQUE INDEX IF NOT EXISTS environments_one_default_per_game
  ON public.environments (game_id)
  WHERE is_default = TRUE;
