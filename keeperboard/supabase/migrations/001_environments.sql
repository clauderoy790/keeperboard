-- Migration 001: Add Environments System
-- This migration adds custom environments per game and modifies api_keys and leaderboards to use environment_id

-- ============================================
-- 1. CREATE ENVIRONMENTS TABLE
-- ============================================

CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- e.g. "Production", "Development", "Staging"
  slug TEXT NOT NULL,           -- e.g. "production", "dev", "staging"
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(game_id, slug)
);

CREATE INDEX idx_environments_game ON environments(game_id);

-- ============================================
-- 2. MIGRATE EXISTING GAMES TO HAVE DEFAULT ENVIRONMENT
-- ============================================

-- For each existing game, create a "production" environment
INSERT INTO environments (game_id, name, slug, is_default)
SELECT id, 'Production', 'production', TRUE
FROM games;

-- ============================================
-- 3. MODIFY API_KEYS TABLE
-- ============================================

-- Add environment_id column (nullable temporarily for migration)
ALTER TABLE api_keys ADD COLUMN environment_id UUID REFERENCES environments(id) ON DELETE CASCADE;

-- Migrate existing api_keys to the production environment
UPDATE api_keys
SET environment_id = (
  SELECT e.id
  FROM environments e
  WHERE e.game_id = api_keys.game_id AND e.slug = 'production'
  LIMIT 1
)
WHERE environment = 'prod';

-- For dev keys, create dev environments if they don't exist, then link
DO $$
DECLARE
  api_key_record RECORD;
  dev_env_id UUID;
BEGIN
  FOR api_key_record IN SELECT * FROM api_keys WHERE environment = 'dev' LOOP
    -- Check if dev environment exists for this game
    SELECT id INTO dev_env_id
    FROM environments
    WHERE game_id = api_key_record.game_id AND slug = 'dev';

    -- If not, create it
    IF dev_env_id IS NULL THEN
      INSERT INTO environments (game_id, name, slug, is_default)
      VALUES (api_key_record.game_id, 'Development', 'dev', FALSE)
      RETURNING id INTO dev_env_id;
    END IF;

    -- Link the api_key to the dev environment
    UPDATE api_keys SET environment_id = dev_env_id WHERE id = api_key_record.id;
  END LOOP;
END $$;

-- Now make environment_id NOT NULL
ALTER TABLE api_keys ALTER COLUMN environment_id SET NOT NULL;

-- Drop the old environment column
ALTER TABLE api_keys DROP COLUMN environment;

-- Update unique constraint to use environment_id instead
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_game_id_environment_key;
ALTER TABLE api_keys ADD CONSTRAINT api_keys_game_id_environment_id_key UNIQUE(game_id, environment_id);

-- ============================================
-- 4. MODIFY LEADERBOARDS TABLE
-- ============================================

-- Add environment_id column (nullable temporarily for migration)
ALTER TABLE leaderboards ADD COLUMN environment_id UUID REFERENCES environments(id) ON DELETE CASCADE;

-- Migrate existing leaderboards to the production environment
UPDATE leaderboards
SET environment_id = (
  SELECT e.id
  FROM environments e
  WHERE e.game_id = leaderboards.game_id AND e.slug = 'production'
  LIMIT 1
);

-- Now make environment_id NOT NULL
ALTER TABLE leaderboards ALTER COLUMN environment_id SET NOT NULL;

-- Update unique constraint to include environment_id
ALTER TABLE leaderboards DROP CONSTRAINT IF EXISTS leaderboards_game_id_slug_key;
ALTER TABLE leaderboards ADD CONSTRAINT leaderboards_game_id_slug_environment_id_key UNIQUE(game_id, slug, environment_id);

-- Add index for filtering by environment
CREATE INDEX idx_leaderboards_environment ON leaderboards(environment_id);

-- ============================================
-- 5. FUNCTION TO AUTO-CREATE PRODUCTION ENVIRONMENT FOR NEW GAMES
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_game()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.environments (game_id, name, slug, is_default)
  VALUES (NEW.id, 'Production', 'production', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_game_created
  AFTER INSERT ON games
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_game();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. Regenerate TypeScript types: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
