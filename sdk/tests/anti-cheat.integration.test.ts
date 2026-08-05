/**
 * Anti-Cheat Integration Tests
 *
 * Tests that anti-cheat measures correctly block attack vectors:
 * - Direct score submission without run token (when required)
 * - Replay of used run_id
 * - Score submission before min elapsed time
 * - Score above cap
 * - Invalid/missing signatures (when signing enabled)
 *
 * These are NEGATIVE tests - they expect attacks to be REJECTED.
 *
 * Requires environment variables:
 * - KEEPERBOARD_API_URL: The API URL (e.g., http://localhost:3000)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key (for setup/teardown)
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

interface AntiCheatFixtures {
  supabase: SupabaseClient;
  userId: string;
  gameId: string;
  environmentId: string;
  leaderboardId: string;
  leaderboardName: string;
  apiKey: string;
  signingSecret: string;
  client: KeeperBoardClient;
  clientWithSigning: KeeperBoardClient;
}

let fixtures: AntiCheatFixtures;

const testRunId = randomBytes(4).toString('hex');
const testGameName = `Anti-Cheat Test Game ${testRunId}`;
const testLeaderboardName = `anticheat-test-${testRunId}`;

// Anti-cheat settings for test leaderboard
const SCORE_CAP = 10000;
const MIN_ELAPSED_SECONDS = 2;

// ============================================
// SETUP & TEARDOWN
// ============================================

async function createAntiCheatFixtures(): Promise<AntiCheatFixtures> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  // 1. Create or get a test user
  const testEmail = 'anticheat-test@keeperboard.test';
  let userId: string;

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', testEmail)
    .single();

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'test-password-123',
        email_confirm: true,
      });

    if (authError) throw new Error(`Failed to create test user: ${authError.message}`);
    userId = authUser.user.id;

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // 2. Create test game with anti-cheat enabled (all settings at game level now)
  const signingSecret = randomBytes(32).toString('base64');

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      user_id: userId,
      name: testGameName,
      signing_secret: signingSecret,
      signing_enabled: true,
      score_cap: SCORE_CAP,
      min_elapsed_seconds: MIN_ELAPSED_SECONDS,
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

  // 5. Create test leaderboard (anti-cheat settings are now at game level)
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

  // 6. Create SDK clients
  const client = new KeeperBoardClient({
    apiUrl: API_URL,
    apiKey: apiKeyRaw,
    defaultLeaderboard: testLeaderboardName,
  });

  const clientWithSigning = new KeeperBoardClient({
    apiUrl: API_URL,
    apiKey: apiKeyRaw,
    defaultLeaderboard: testLeaderboardName,
    signingSecret: signingSecret,
  });

  return {
    supabase,
    userId,
    gameId: game.id,
    environmentId: environment.id,
    leaderboardId: leaderboard.id,
    leaderboardName: testLeaderboardName,
    apiKey: apiKeyRaw,
    signingSecret,
    client,
    clientWithSigning,
  };
}

async function cleanupAntiCheatFixtures(f: AntiCheatFixtures): Promise<void> {
  // Clean up game_runs first (foreign key)
  await f.supabase
    .from('game_runs')
    .delete()
    .eq('leaderboard_id', f.leaderboardId);

  // Clean up scores
  await f.supabase
    .from('scores')
    .delete()
    .eq('leaderboard_id', f.leaderboardId);

  await f.supabase
    .from('leaderboards')
    .delete()
    .eq('id', f.leaderboardId);

  await f.supabase
    .from('api_keys')
    .delete()
    .eq('game_id', f.gameId);

  await f.supabase
    .from('environments')
    .delete()
    .eq('game_id', f.gameId);

  await f.supabase
    .from('games')
    .delete()
    .eq('id', f.gameId);
}

// ============================================
// TEST SUITE
// ============================================

describe('Anti-Cheat Security Tests', () => {
  beforeAll(async () => {
    fixtures = await createAntiCheatFixtures();
  }, 30000);

  afterAll(async () => {
    if (fixtures) {
      await cleanupAntiCheatFixtures(fixtures);
    }
  }, 30000);

  // ----------------------------------------
  // Note: Direct score submission via /api/v1/scores is allowed for backward compatibility.
  // The run token flow is opt-in - games should use startRun/finishRun for protection.
  // This test verifies that the run-based flow provides protection.
  // ----------------------------------------

  // ----------------------------------------
  // Attack: Replay same run_id
  // ----------------------------------------

  describe('Run Token Replay Attack', () => {
    it('should reject replay of used run_id', async () => {
      const playerGuid = `replay-test-${testRunId}`;

      // Start a legitimate run
      const startResult = await fixtures.clientWithSigning.startRun({
        playerGuid,
      });

      expect(startResult.runId).toBeDefined();
      const runId = startResult.runId;

      // Wait for min elapsed time
      await new Promise((r) => setTimeout(r, (MIN_ELAPSED_SECONDS + 1) * 1000));

      // First finish - should succeed
      const finish1 = await fixtures.clientWithSigning.finishRun({
        runId,
        playerGuid,
        playerName: 'PLAYER1',
        score: 100,
      });

      expect(finish1.rank).toBeGreaterThan(0);

      // Second finish with same run_id - should fail
      try {
        await fixtures.clientWithSigning.finishRun({
          runId,
          playerGuid,
          playerName: 'PLAYER1',
          score: 200,
        });
        expect.fail('Should have rejected replay');
      } catch (error) {
        expect(error).toBeInstanceOf(KeeperBoardError);
        const kbError = error as KeeperBoardError;
        expect(['RUN_ALREADY_USED', 'INVALID_REQUEST', 'NOT_FOUND']).toContain(kbError.code);
      }
    });
  });

  // ----------------------------------------
  // Attack: Submit before min elapsed time
  // ----------------------------------------

  describe('Min Elapsed Time Bypass', () => {
    it('should reject score submitted before min elapsed time', async () => {
      const playerGuid = `speedrun-${testRunId}`;

      // Start a run
      const startResult = await fixtures.clientWithSigning.startRun({
        playerGuid,
      });

      // Immediately try to finish (should fail)
      try {
        await fixtures.clientWithSigning.finishRun({
          runId: startResult.runId,
          playerGuid,
          playerName: 'SPEEDRUNNER',
          score: 100,
        });
        expect.fail('Should have rejected instant submission');
      } catch (error) {
        expect(error).toBeInstanceOf(KeeperBoardError);
        const kbError = error as KeeperBoardError;
        expect(['ELAPSED_TIME_TOO_SHORT', 'INVALID_REQUEST']).toContain(kbError.code);
      }
    });
  });

  // ----------------------------------------
  // Attack: Score above cap
  // ----------------------------------------

  describe('Score Cap Bypass', () => {
    it('should reject score above cap', async () => {
      const playerGuid = `overcap-${testRunId}`;

      // Start a run
      const startResult = await fixtures.clientWithSigning.startRun({
        playerGuid,
      });

      // Wait for min elapsed time
      await new Promise((r) => setTimeout(r, (MIN_ELAPSED_SECONDS + 1) * 1000));

      // Try to submit impossibly high score
      try {
        await fixtures.clientWithSigning.finishRun({
          runId: startResult.runId,
          playerGuid,
          playerName: 'CHEATER',
          score: SCORE_CAP + 1000000, // Way above cap
        });
        expect.fail('Should have rejected score above cap');
      } catch (error) {
        expect(error).toBeInstanceOf(KeeperBoardError);
        const kbError = error as KeeperBoardError;
        expect(['SCORE_CAP_EXCEEDED', 'INVALID_REQUEST']).toContain(kbError.code);
      }
    });
  });

  // ----------------------------------------
  // Attack: Invalid signature
  // ----------------------------------------

  describe('Signature Validation', () => {
    it('should reject requests with invalid signature when signing is enabled', async () => {
      // Create a client with wrong signing secret
      const badClient = new KeeperBoardClient({
        apiUrl: API_URL,
        apiKey: fixtures.apiKey,
        defaultLeaderboard: fixtures.leaderboardName,
        signingSecret: 'wrong-secret-here',
      });

      const playerGuid = `badsig-${testRunId}`;

      try {
        await badClient.startRun({ playerGuid });
        expect.fail('Should have rejected invalid signature');
      } catch (error) {
        expect(error).toBeInstanceOf(KeeperBoardError);
        const kbError = error as KeeperBoardError;
        expect(['INVALID_SIGNATURE', 'UNAUTHORIZED', 'INVALID_REQUEST']).toContain(kbError.code);
      }
    });

    it('should reject requests without signature when signing is required', async () => {
      // Create a client without signing secret
      const noSignClient = new KeeperBoardClient({
        apiUrl: API_URL,
        apiKey: fixtures.apiKey,
        defaultLeaderboard: fixtures.leaderboardName,
        // No signingSecret
      });

      const playerGuid = `nosig-${testRunId}`;

      try {
        await noSignClient.startRun({ playerGuid });
        expect.fail('Should have rejected missing signature');
      } catch (error) {
        expect(error).toBeInstanceOf(KeeperBoardError);
        const kbError = error as KeeperBoardError;
        expect(['MISSING_SIGNATURE', 'UNAUTHORIZED', 'INVALID_REQUEST']).toContain(kbError.code);
      }
    });
  });

  // ----------------------------------------
  // Positive test: Legitimate flow should work
  // ----------------------------------------

  describe('Legitimate Game Flow', () => {
    it('should accept valid score with proper run token and signature', async () => {
      const playerGuid = `legit-player-${testRunId}`;

      // Start run
      const startResult = await fixtures.clientWithSigning.startRun({
        playerGuid,
      });

      expect(startResult.runId).toBeDefined();
      expect(startResult.startedAt).toBeDefined();
      expect(startResult.expiresAt).toBeDefined();

      // Wait for min elapsed time
      await new Promise((r) => setTimeout(r, (MIN_ELAPSED_SECONDS + 1) * 1000));

      // Submit valid score
      const finishResult = await fixtures.clientWithSigning.finishRun({
        runId: startResult.runId,
        playerGuid,
        playerName: 'LEGITPLAYER',
        score: 500, // Below cap
      });

      expect(finishResult.rank).toBeGreaterThan(0);
      expect(finishResult.isNewHighScore).toBe(true);
    });

    it('should allow multiple legitimate runs from same player', async () => {
      const playerGuid = `multi-run-${testRunId}`;

      // First run
      const start1 = await fixtures.clientWithSigning.startRun({ playerGuid });
      await new Promise((r) => setTimeout(r, (MIN_ELAPSED_SECONDS + 1) * 1000));
      const finish1 = await fixtures.clientWithSigning.finishRun({
        runId: start1.runId,
        playerGuid,
        playerName: 'PLAYER',
        score: 100,
      });
      expect(finish1.rank).toBeGreaterThan(0);

      // Second run (new run token)
      const start2 = await fixtures.clientWithSigning.startRun({ playerGuid });
      await new Promise((r) => setTimeout(r, (MIN_ELAPSED_SECONDS + 1) * 1000));
      const finish2 = await fixtures.clientWithSigning.finishRun({
        runId: start2.runId,
        playerGuid,
        playerName: 'PLAYER',
        score: 200,
      });
      expect(finish2.rank).toBeGreaterThan(0);
      expect(finish2.isNewHighScore).toBe(true);
    });
  });
}, 120000); // 2 minute timeout for the whole suite due to elapsed time waits
