/**
 * End-to-end tests for Plan 24 Phase 2 — platform, country, game_version and source
 * on the public API.
 *
 * SAFETY: this suite creates its own throwaway game, environment, leaderboard and API key
 * with a random per-run suffix, and deletes them in afterAll. Every delete is keyed to an
 * ID this run created — nothing queries by name pattern, and nothing touches existing data.
 * Teardown runs even when assertions fail, so a failed run cannot orphan rows.
 *
 * These hit the raw REST API rather than the SDK, because the SDK does not send platform
 * until Plan 24 Phase 3.
 *
 * Requires (already present in sdk/.env):
 *   KEEPERBOARD_API_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Run with:  npx vitest run tests/platform.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import { KeeperBoardClient } from '../src';

const API_URL = process.env.KEEPERBOARD_API_URL || 'http://localhost:3099';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY (see sdk/.env.example)');
}

const runId = randomBytes(4).toString('hex');
const GAME_NAME = `Platform Test Game ${runId}`;
const LEADERBOARD_NAME = `platform-test-${runId}`;

interface Fixtures {
  supabase: SupabaseClient;
  gameId: string;
  environmentId: string;
  leaderboardId: string;
  apiKey: string;
}

let fx: Fixtures;

// ============================================
// SETUP / TEARDOWN
// ============================================

async function createFixtures(): Promise<Fixtures> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  // Reuse the shared test user if a previous suite created it
  const testEmail = 'sdk-test@keeperboard.test';
  let userId: string;

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', testEmail)
    .single();

  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data: authUser, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'test-password-123',
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create test user: ${error.message}`);
    userId = authUser.user.id;
    await new Promise((r) => setTimeout(r, 500));
  }

  // min_elapsed_seconds: 0 so finishRun works immediately instead of needing a 5s wait
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ user_id: userId, name: GAME_NAME, min_elapsed_seconds: 0 })
    .select()
    .single();
  if (gameError) throw new Error(`Failed to create game: ${gameError.message}`);

  const { data: environment, error: envError } = await supabase
    .from('environments')
    .select('id')
    .eq('game_id', game.id)
    .eq('is_default', true)
    .single();
  if (envError) throw new Error(`Failed to get environment: ${envError.message}`);

  const apiKey = `kb_test_${randomBytes(24).toString('hex')}`;
  const { error: keyError } = await supabase.from('api_keys').insert({
    game_id: game.id,
    environment_id: environment.id,
    key_prefix: apiKey.substring(0, 12),
    key_hash: createHash('sha256').update(apiKey).digest('hex'),
  });
  if (keyError) throw new Error(`Failed to create API key: ${keyError.message}`);

  const { data: leaderboard, error: lbError } = await supabase
    .from('leaderboards')
    .insert({
      game_id: game.id,
      environment_id: environment.id,
      name: LEADERBOARD_NAME,
      sort_order: 'desc',
      reset_schedule: 'none',
      reset_hour: 0,
      current_version: 1,
      current_period_start: new Date().toISOString(),
    })
    .select()
    .single();
  if (lbError) throw new Error(`Failed to create leaderboard: ${lbError.message}`);

  return {
    supabase,
    gameId: game.id,
    environmentId: environment.id,
    leaderboardId: leaderboard.id,
    apiKey,
  };
}

/**
 * Deletes in FK-safe order. scores.run_id references game_runs with no ON DELETE clause,
 * so scores must go before game_runs or the delete errors.
 */
async function cleanupFixtures(f: Fixtures): Promise<void> {
  await f.supabase.from('scores').delete().eq('leaderboard_id', f.leaderboardId);
  await f.supabase.from('game_runs').delete().eq('leaderboard_id', f.leaderboardId);
  await f.supabase.from('leaderboards').delete().eq('id', f.leaderboardId);
  await f.supabase.from('api_keys').delete().eq('game_id', f.gameId);
  await f.supabase.from('environments').delete().eq('game_id', f.gameId);
  await f.supabase.from('games').delete().eq('id', f.gameId);
}

// ============================================
// HELPERS
// ============================================

interface ApiResult {
  status: number;
  body: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    code?: string;
  };
}

async function post(path: string, payload: unknown): Promise<ApiResult> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': fx.apiKey },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
}

const startRun = (payload: Record<string, unknown>) =>
  post(`/api/v1/runs/start?leaderboard=${LEADERBOARD_NAME}`, payload);

const finishRun = (payload: Record<string, unknown>) =>
  post('/api/v1/runs/finish', payload);

const submitScore = (payload: Record<string, unknown>) =>
  post(`/api/v1/scores?leaderboard=${LEADERBOARD_NAME}`, payload);

async function getRun(runId: string) {
  const { data } = await fx.supabase
    .from('game_runs')
    .select('platform, country, game_version, source, used')
    .eq('id', runId)
    .single();
  return data;
}

async function getScore(playerGuid: string) {
  const { data } = await fx.supabase
    .from('scores')
    .select('platform, score')
    .eq('leaderboard_id', fx.leaderboardId)
    .eq('player_guid', playerGuid)
    .single();
  return data;
}

let playerCounter = 0;
const nextPlayer = () => `p-${runId}-${++playerCounter}`;

// ============================================
// TESTS
// ============================================

describe('Plan 24 Phase 2 — platform & analytics dimensions', () => {
  beforeAll(async () => {
    fx = await createFixtures();
  }, 30000);

  afterAll(async () => {
    if (fx) await cleanupFixtures(fx);
  }, 30000);

  describe('POST /v1/runs/start', () => {
    it('stores a valid platform', async () => {
      const player = nextPlayer();
      const res = await startRun({ player_guid: player, platform: 'ios' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const run = await getRun(res.body.data!.run_id as string);
      expect(run?.platform).toBe('ios');
    });

    it('accepts all six platforms', async () => {
      for (const platform of ['web', 'ios', 'android', 'windows', 'macos', 'linux']) {
        const res = await startRun({ player_guid: nextPlayer(), platform });
        expect(res.status, `platform=${platform}`).toBe(200);

        const run = await getRun(res.body.data!.run_id as string);
        expect(run?.platform).toBe(platform);
      }
    });

    it('normalizes casing', async () => {
      const res = await startRun({ player_guid: nextPlayer(), platform: 'iOS' });
      expect(res.status).toBe(200);

      const run = await getRun(res.body.data!.run_id as string);
      expect(run?.platform).toBe('ios');
    });

    it('rejects an unrecognized platform with 400 INVALID_PLATFORM', async () => {
      const res = await startRun({ player_guid: nextPlayer(), platform: 'iPhone' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_PLATFORM');
      expect(res.body.error).toContain('iPhone');
      expect(res.body.error).toContain('web, ios, android, windows, macos, linux');
    });

    it('accepts an absent platform — SDK <= 2.2.2 backward compatibility', async () => {
      const res = await startRun({ player_guid: nextPlayer() });

      expect(res.status).toBe(200);
      const run = await getRun(res.body.data!.run_id as string);
      expect(run?.platform).toBeNull();
    });

    it('stores game_version and source', async () => {
      const res = await startRun({
        player_guid: nextPlayer(),
        platform: 'web',
        game_version: '1.4.2',
        source: 'reddit-webgames',
      });

      const run = await getRun(res.body.data!.run_id as string);
      expect(run?.game_version).toBe('1.4.2');
      expect(run?.source).toBe('reddit-webgames');
    });

    it('sanitizes source rather than rejecting it', async () => {
      const res = await startRun({
        player_guid: nextPlayer(),
        platform: 'web',
        source: 'Reddit WebGames!',
      });

      expect(res.status).toBe(200);
      const run = await getRun(res.body.data!.run_id as string);
      expect(run?.source).toBe('redditwebgames');
    });

    it('truncates over-long values to the column constraints', async () => {
      const res = await startRun({
        player_guid: nextPlayer(),
        platform: 'web',
        game_version: 'v'.repeat(80),
        source: 'a'.repeat(200),
      });

      expect(res.status).toBe(200);
      const run = await getRun(res.body.data!.run_id as string);
      expect(run?.game_version).toHaveLength(32);
      expect(run?.source).toHaveLength(64);
    });

    it('leaves country null locally, where the Vercel header is absent', async () => {
      const res = await startRun({ player_guid: nextPlayer(), platform: 'web' });

      const run = await getRun(res.body.data!.run_id as string);
      expect(run?.country).toBeNull();
    });
  });

  describe('POST /v1/runs/finish', () => {
    it('writes platform onto the score', async () => {
      const player = nextPlayer();
      const started = await startRun({ player_guid: player, platform: 'android' });

      const res = await finishRun({
        run_id: started.body.data!.run_id,
        player_guid: player,
        player_name: 'FinishTester',
        score: 1234,
        platform: 'android',
      });

      expect(res.status).toBe(200);
      const score = await getScore(player);
      expect(score?.platform).toBe('android');
      expect(score?.score).toBe(1234);
    });

    it('rejects an invalid platform without consuming the run', async () => {
      const player = nextPlayer();
      const started = await startRun({ player_guid: player, platform: 'web' });
      const runId = started.body.data!.run_id as string;

      const bad = await finishRun({
        run_id: runId,
        player_guid: player,
        player_name: 'NotConsumed',
        score: 500,
        platform: 'iPhone',
      });

      expect(bad.status).toBe(400);
      expect(bad.body.code).toBe('INVALID_PLATFORM');

      // The run must still be usable — a developer's typo should not burn a player's run
      const run = await getRun(runId);
      expect(run?.used).toBe(false);

      const retry = await finishRun({
        run_id: runId,
        player_guid: player,
        player_name: 'NotConsumed',
        score: 500,
        platform: 'web',
      });
      expect(retry.status).toBe(200);
    });

    it('accepts an absent platform', async () => {
      const player = nextPlayer();
      const started = await startRun({ player_guid: player });

      const res = await finishRun({
        run_id: started.body.data!.run_id,
        player_guid: player,
        player_name: 'NoPlatform',
        score: 42,
      });

      expect(res.status).toBe(200);
      const score = await getScore(player);
      expect(score?.platform).toBeNull();
    });
  });

  describe('POST /v1/scores (non-anti-cheat path)', () => {
    it('writes platform on insert', async () => {
      const player = nextPlayer();
      const res = await submitScore({
        player_guid: player,
        player_name: 'DirectSubmit',
        score: 777,
        platform: 'macos',
      });

      expect(res.status).toBe(200);
      const score = await getScore(player);
      expect(score?.platform).toBe('macos');
    });

    it('updates platform when a higher score replaces the old one', async () => {
      const player = nextPlayer();
      await submitScore({
        player_guid: player,
        player_name: 'Switcher',
        score: 100,
        platform: 'web',
      });

      await submitScore({
        player_guid: player,
        player_name: 'Switcher',
        score: 900,
        platform: 'linux',
      });

      const score = await getScore(player);
      expect(score?.score).toBe(900);
      expect(score?.platform).toBe('linux');
    });

    it('rejects an unrecognized platform with 400', async () => {
      const res = await submitScore({
        player_guid: nextPlayer(),
        player_name: 'BadPlatform',
        score: 10,
        platform: 'Nintendo',
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_PLATFORM');
    });

    it('accepts an absent platform', async () => {
      const player = nextPlayer();
      const res = await submitScore({
        player_guid: player,
        player_name: 'LegacyClient',
        score: 55,
      });

      expect(res.status).toBe(200);
      const score = await getScore(player);
      expect(score?.platform).toBeNull();
    });
  });

  describe('SDK sends platform (Phase 3)', () => {
    it('submitScore carries the platform from config', async () => {
      const player = nextPlayer();
      const client = new KeeperBoardClient({
        apiUrl: API_URL,
        apiKey: fx.apiKey,
        platform: 'ios',
        defaultLeaderboard: LEADERBOARD_NAME,
      });

      await client.submitScore({
        playerGuid: player,
        playerName: 'SdkPlatform',
        score: 4321,
      });

      const score = await getScore(player);
      expect(score?.platform).toBe('ios');
    });

    it('startRun carries platform, gameVersion and source', async () => {
      const player = nextPlayer();
      const client = new KeeperBoardClient({
        apiUrl: API_URL,
        apiKey: fx.apiKey,
        platform: 'android',
        gameVersion: '9.9.9',
        defaultLeaderboard: LEADERBOARD_NAME,
      });

      const run = await client.startRun({
        playerGuid: player,
        source: 'sdk-test-source',
      });

      const stored = await getRun(run.runId);
      expect(stored?.platform).toBe('android');
      expect(stored?.game_version).toBe('9.9.9');
      expect(stored?.source).toBe('sdk-test-source');
    });

    it('finishRun carries the platform onto the score', async () => {
      const player = nextPlayer();
      const client = new KeeperBoardClient({
        apiUrl: API_URL,
        apiKey: fx.apiKey,
        platform: 'macos',
        defaultLeaderboard: LEADERBOARD_NAME,
      });

      const run = await client.startRun({ playerGuid: player });
      await client.finishRun({
        runId: run.runId,
        playerGuid: player,
        playerName: 'SdkFinish',
        score: 8888,
      });

      const score = await getScore(player);
      expect(score?.platform).toBe('macos');
    });
  });

  describe('teardown safety', () => {
    it('created its own isolated game, not an existing one', async () => {
      const { data } = await fx.supabase
        .from('games')
        .select('name')
        .eq('id', fx.gameId)
        .single();

      expect(data?.name).toBe(GAME_NAME);
      expect(data?.name).toContain(runId);
    });
  });
});
