-- KeeperBoard Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. USERS TABLE (extends auth.users)
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. GAMES TABLE
-- ============================================

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, slug)
);

CREATE INDEX idx_games_user ON games(user_id);

-- ============================================
-- 3. API_KEYS TABLE
-- ============================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  environment TEXT NOT NULL CHECK (environment IN ('dev', 'prod')),
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(game_id, environment)
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_game ON api_keys(game_id);

-- ============================================
-- 4. LEADERBOARDS TABLE
-- ============================================

CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'High Scores',
  slug TEXT NOT NULL DEFAULT 'high-scores',
  sort_order TEXT NOT NULL DEFAULT 'desc' CHECK (sort_order IN ('asc', 'desc')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(game_id, slug)
);

CREATE INDEX idx_leaderboards_game ON leaderboards(game_id);

-- ============================================
-- 5. SCORES TABLE
-- ============================================

CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  player_guid TEXT,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_migrated BOOLEAN DEFAULT FALSE,
  migrated_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(leaderboard_id, player_guid)
);

CREATE INDEX idx_scores_leaderboard ON scores(leaderboard_id);
CREATE INDEX idx_scores_leaderboard_score ON scores(leaderboard_id, score DESC);
CREATE INDEX idx_scores_player_guid ON scores(player_guid);
CREATE INDEX idx_scores_player_name ON scores(player_name);
