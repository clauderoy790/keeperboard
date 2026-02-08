/**
 * Integration tests for KeeperBoard SDK.
 *
 * These tests create real data in the database and clean up after themselves.
 * Requires environment variables:
 * - KEEPERBOARD_API_URL: The API URL (e.g., http://localhost:3000)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key (for setup/teardown)
 *
 * Run with: npm test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import { KeeperBoardClient, KeeperBoardError } from '../src';

// ============================================
// TEST CONFIGURATION
// ============================================

const API_URL = process.env.KEEPERBOARD_API_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY'
  );
}

// ============================================
// TEST FIXTURES
// ============================================

interface TestFixtures {
  supabase: SupabaseClient;
  userId: string;
  gameId: string;
  environmentId: string;
  leaderboardId: string;
  apiKey: string;
  client: KeeperBoardClient;
}

let fixtures: TestFixtures;

// Generate unique IDs for this test run
const testRunId = randomBytes(4).toString('hex');
const testGameName = `SDK Test Game ${testRunId}`;
const testLeaderboardName = `Test Leaderboard ${testRunId}`;

// ============================================
// SETUP & TEARDOWN
// ============================================

async function createTestFixtures(): Promise<TestFixtures> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  // 1. Create or get a test user
  // We'll use a fixed test user email
  const testEmail = 'sdk-test@keeperboard.test';
  let userId: string;

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', testEmail)
    .single();

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // Create auth user first, then the profile will be auto-created by trigger
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'test-password-123',
        email_confirm: true,
      });

    if (authError) throw new Error(`Failed to create test user: ${authError.message}`);
    userId = authUser.user.id;

    // Wait for trigger to create user profile
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // 2. Create test game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      user_id: userId,
      name: testGameName,
    })
    .select()
    .single();

  if (gameError) throw new Error(`Failed to create test game: ${gameError.message}`);

  // 3. Get the auto-created production environment
  const { data: environment, error: envError } = await supabase
    .from('environments')
    .select('id')
    .eq('game_id', game.id)
    .eq('is_default', true)
    .single();

  if (envError) throw new Error(`Failed to get environment: ${envError.message}`);

  // 4. Create API key
  const apiKeyRaw = `kb_test_${randomBytes(24).toString('hex')}`;
  const keyHash = createHash('sha256').update(apiKeyRaw).digest('hex');

  const { error: keyError } = await supabase.from('api_keys').insert({
    game_id: game.id,
    environment_id: environment.id,
    key_prefix: apiKeyRaw.substring(0, 12),
    key_hash: keyHash,
  });

  if (keyError) throw new Error(`Failed to create API key: ${keyError.message}`);

  // 5. Create test leaderboard
  const { data: leaderboard, error: lbError } = await supabase
    .from('leaderboards')
    .insert({
      game_id: game.id,
      environment_id: environment.id,
      name: testLeaderboardName,
      sort_order: 'desc',
      reset_schedule: 'none',
      reset_hour: 0,
      current_version: 1,
      current_period_start: new Date().toISOString(),
    })
    .select()
    .single();

  if (lbError) throw new Error(`Failed to create leaderboard: ${lbError.message}`);

  // 6. Create SDK client
  const client = new KeeperBoardClient({
    apiUrl: API_URL,
    apiKey: apiKeyRaw,
  });

  return {
    supabase,
    userId,
    gameId: game.id,
    environmentId: environment.id,
    leaderboardId: leaderboard.id,
    apiKey: apiKeyRaw,
    client,
  };
}

async function cleanupTestFixtures(f: TestFixtures): Promise<void> {
  // Delete in reverse order of dependencies
  // Scores are cascade-deleted with leaderboard

  // Delete leaderboard
  await f.supabase
    .from('leaderboards')
    .delete()
    .eq('id', f.leaderboardId);

  // Delete API key
  await f.supabase
    .from('api_keys')
    .delete()
    .eq('game_id', f.gameId);

  // Delete environments (cascade from game won't work, need explicit delete)
  await f.supabase
    .from('environments')
    .delete()
    .eq('game_id', f.gameId);

  // Delete game
  await f.supabase
    .from('games')
    .delete()
    .eq('id', f.gameId);

  // Note: We don't delete the test user to avoid issues with auth
}

// ============================================
// TEST SUITE
// ============================================

describe('KeeperBoard SDK Integration Tests', () => {
  beforeAll(async () => {
    fixtures = await createTestFixtures();
  }, 30000);

  afterAll(async () => {
    if (fixtures) {
      await cleanupTestFixtures(fixtures);
    }
  }, 30000);

  // ----------------------------------------
  // Health Check
  // ----------------------------------------

  describe('healthCheck()', () => {
    it('should return API health status', async () => {
      const health = await fixtures.client.healthCheck();

      expect(health.service).toBe('keeperboard');
      expect(health.version).toBeDefined();
      expect(health.timestamp).toBeDefined();
    });
  });

  // ----------------------------------------
  // Submit Score
  // ----------------------------------------

  describe('submitScore()', () => {
    const playerGuid = `player-${testRunId}-1`;

    it('should submit a new score', async () => {
      const result = await fixtures.client.submitScore(
        playerGuid,
        'TestPlayer1',
        1000,
        testLeaderboardName
      );

      expect(result.player_guid).toBe(playerGuid);
      expect(result.player_name).toBe('TestPlayer1');
      expect(result.score).toBe(1000);
      expect(result.rank).toBe(1);
      expect(result.is_new_high_score).toBe(true);
    });

    it('should update score if higher', async () => {
      const result = await fixtures.client.submitScore(
        playerGuid,
        'TestPlayer1',
        2000,
        testLeaderboardName
      );

      expect(result.score).toBe(2000);
      expect(result.is_new_high_score).toBe(true);
    });

    it('should not update score if lower', async () => {
      const result = await fixtures.client.submitScore(
        playerGuid,
        'TestPlayer1',
        500,
        testLeaderboardName
      );

      expect(result.score).toBe(2000); // Still the old high score
      expect(result.is_new_high_score).toBe(false);
    });

    it('should calculate correct rank with multiple players', async () => {
      // Add more players
      await fixtures.client.submitScore(
        `player-${testRunId}-2`,
        'TestPlayer2',
        3000,
        testLeaderboardName
      );
      await fixtures.client.submitScore(
        `player-${testRunId}-3`,
        'TestPlayer3',
        1500,
        testLeaderboardName
      );

      // Player1 (2000) should be rank 2 now
      const result = await fixtures.client.submitScore(
        playerGuid,
        'TestPlayer1',
        100, // Lower score, won't update
        testLeaderboardName
      );

      expect(result.rank).toBe(2);
    });
  });

  // ----------------------------------------
  // Get Leaderboard
  // ----------------------------------------

  describe('getLeaderboard()', () => {
    it('should return leaderboard entries', async () => {
      const lb = await fixtures.client.getLeaderboard(testLeaderboardName);

      expect(lb.entries).toHaveLength(3);
      expect(lb.total_count).toBe(3);
      expect(lb.reset_schedule).toBe('none');

      // Should be sorted by score descending
      expect(lb.entries[0].score).toBe(3000);
      expect(lb.entries[0].rank).toBe(1);
      expect(lb.entries[1].score).toBe(2000);
      expect(lb.entries[1].rank).toBe(2);
      expect(lb.entries[2].score).toBe(1500);
      expect(lb.entries[2].rank).toBe(3);
    });

    it('should respect limit parameter', async () => {
      const lb = await fixtures.client.getLeaderboard(testLeaderboardName, 2);

      expect(lb.entries).toHaveLength(2);
      expect(lb.total_count).toBe(3); // Total is still 3
    });

    it('should respect offset parameter', async () => {
      const lb = await fixtures.client.getLeaderboard(testLeaderboardName, 10, 1);

      expect(lb.entries).toHaveLength(2); // 3 total, skip 1
      expect(lb.entries[0].rank).toBe(2); // Starts at rank 2
    });
  });

  // ----------------------------------------
  // Get Player Rank
  // ----------------------------------------

  describe('getPlayerRank()', () => {
    it('should return player rank and score', async () => {
      const player = await fixtures.client.getPlayerRank(
        `player-${testRunId}-1`,
        testLeaderboardName
      );

      expect(player).not.toBeNull();
      expect(player!.score).toBe(2000);
      expect(player!.rank).toBe(2);
      expect(player!.player_name).toBe('TestPlayer1');
    });

    it('should return null for non-existent player', async () => {
      const player = await fixtures.client.getPlayerRank(
        'non-existent-player-guid',
        testLeaderboardName
      );

      expect(player).toBeNull();
    });
  });

  // ----------------------------------------
  // Update Player Name
  // ----------------------------------------

  describe('updatePlayerName()', () => {
    it('should update player name', async () => {
      const result = await fixtures.client.updatePlayerName(
        `player-${testRunId}-1`,
        'UpdatedPlayerName',
        testLeaderboardName
      );

      expect(result.player_name).toBe('UpdatedPlayerName');
      expect(result.score).toBe(2000); // Score unchanged
    });

    it('should throw error for non-existent player', async () => {
      await expect(
        fixtures.client.updatePlayerName(
          'non-existent-player',
          'NewName',
          testLeaderboardName
        )
      ).rejects.toThrow(KeeperBoardError);
    });
  });

  // ----------------------------------------
  // Error Handling
  // ----------------------------------------

  describe('Error Handling', () => {
    it('should throw KeeperBoardError with invalid API key', async () => {
      const badClient = new KeeperBoardClient({
        apiUrl: API_URL,
        apiKey: 'kb_invalid_key',
      });

      try {
        await badClient.getLeaderboard();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(KeeperBoardError);
        expect((error as KeeperBoardError).code).toBe('INVALID_API_KEY');
      }
    });

    it('should throw for non-existent leaderboard', async () => {
      try {
        await fixtures.client.getLeaderboard('Non-Existent Leaderboard');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(KeeperBoardError);
        expect((error as KeeperBoardError).code).toBe('NOT_FOUND');
      }
    });
  });
});
