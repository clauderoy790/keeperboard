-- Migration 003: Remove environment slug and enforce unique name per game

ALTER TABLE public.environments
  DROP CONSTRAINT IF EXISTS environments_game_id_slug_key;

ALTER TABLE public.environments
  DROP COLUMN IF EXISTS slug;

ALTER TABLE public.environments
  ADD CONSTRAINT environments_game_id_name_key UNIQUE (game_id, name);

CREATE OR REPLACE FUNCTION public.handle_new_game()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.environments (game_id, name, is_default)
  VALUES (NEW.id, 'Production', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
