-- KeeperBoard Row Level Security Policies
-- Run this AFTER schema.sql in Supabase SQL Editor

-- ============================================
-- USERS TABLE RLS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- GAMES TABLE RLS
-- ============================================

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games" ON games
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games" ON games
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own games" ON games
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- API_KEYS TABLE RLS
-- ============================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api_keys" ON api_keys
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = api_keys.game_id AND games.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own api_keys" ON api_keys
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE games.id = api_keys.game_id AND games.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own api_keys" ON api_keys
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = api_keys.game_id AND games.user_id = auth.uid())
  );

-- ============================================
-- LEADERBOARDS TABLE RLS
-- ============================================

ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leaderboards" ON leaderboards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = leaderboards.game_id AND games.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own leaderboards" ON leaderboards
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM games WHERE games.id = leaderboards.game_id AND games.user_id = auth.uid())
  );

CREATE POLICY "Users can update own leaderboards" ON leaderboards
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = leaderboards.game_id AND games.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own leaderboards" ON leaderboards
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM games WHERE games.id = leaderboards.game_id AND games.user_id = auth.uid())
  );

-- ============================================
-- SCORES TABLE RLS
-- ============================================

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scores" ON scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leaderboards
      JOIN games ON games.id = leaderboards.game_id
      WHERE leaderboards.id = scores.leaderboard_id AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own scores" ON scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leaderboards
      JOIN games ON games.id = leaderboards.game_id
      WHERE leaderboards.id = scores.leaderboard_id AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own scores" ON scores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM leaderboards
      JOIN games ON games.id = leaderboards.game_id
      WHERE leaderboards.id = scores.leaderboard_id AND games.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own scores" ON scores
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leaderboards
      JOIN games ON games.id = leaderboards.game_id
      WHERE leaderboards.id = scores.leaderboard_id AND games.user_id = auth.uid()
    )
  );
