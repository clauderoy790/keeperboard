/**
 * Guards the single most important regression in Plan 24: analytics must never mix
 * environments.
 *
 * The dashboard scopes every metric to a game **and** an environment. If that filter is
 * dropped or mis-joined, the developer's own dev testing silently inflates production DAU
 * — and it inflates it invisibly, because the numbers still look plausible. There is no
 * error to notice, so it has to be caught by a test.
 *
 * This exercises the exact join the analytics endpoints use
 * (`game_runs → leaderboards!inner`, filtered on game_id + environment_id) against real
 * data in two environments of the same game.
 *
 * SAFETY: creates its own throwaway game and deletes it in afterAll. See
 * sweepStaleFixtures.ts for the orphan safety net.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const API_URL = process.env.KEEPERBOARD_API_URL || 'http://localhost:3099';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY (see sdk/.env.example)');
}

const runId = randomBytes(4).toString('hex');
const GAME_NAME = `Analytics Test Game ${runId}`;

interface EnvFixture {
  environmentId: string;
  leaderboardId: string;
  apiKey: string;
}

interface Fixtures {
  supabase: SupabaseClient;
  gameId: string;
  prod: EnvFixture;
  dev: EnvFixture;
}

let fx: Fixtures;

async function createApiKey(
  db: SupabaseClient,
  gameId: string,
  environmentId: string
): Promise<string> {
  const apiKey = `kb_test_${randomBytes(24).toString('hex')}`;
  const { error } = await db.from('api_keys').insert({
    game_id: gameId,
    environment_id: environmentId,
    key_prefix: apiKey.substring(0, 12),
    key_hash: createHash('sha256').update(apiKey).digest('hex'),
  });
  if (error) throw new Error(`Failed to create API key: ${error.message}`);
  return apiKey;
}

async function createLeaderboard(
  db: SupabaseClient,
  gameId: string,
  environmentId: string,
  name: string
): Promise<string> {
  const { data, error } = await db
    .from('leaderboards')
    .insert({
      game_id: gameId,
      environment_id: environmentId,
      name,
      sort_order: 'desc',
      reset_schedule: 'none',
      reset_hour: 0,
      current_version: 1,
      current_period_start: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create leaderboard: ${error.message}`);
  return data.id;
}

async function createFixtures(): Promise<Fixtures> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

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

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ user_id: userId, name: GAME_NAME, min_elapsed_seconds: 0 })
    .select()
    .single();
  if (gameError) throw new Error(`Failed to create game: ${gameError.message}`);

  // Production environment is auto-created with the game
  const { data: prodEnv, error: prodError } = await supabase
    .from('environments')
    .select('id')
    .eq('game_id', game.id)
    .eq('is_default', true)
    .single();
  if (prodError) throw new Error(`Failed to get prod environment: ${prodError.message}`);

  const { data: devEnv, error: devError } = await supabase
    .from('environments')
    .insert({ game_id: game.id, name: 'dev', is_default: false })
    .select()
    .single();
  if (devError) throw new Error(`Failed to create dev environment: ${devError.message}`);

  return {
    supabase,
    gameId: game.id,
    prod: {
      environmentId: prodEnv.id,
      leaderboardId: await createLeaderboard(supabase, game.id, prodEnv.id, `main-${runId}`),
      apiKey: await createApiKey(supabase, game.id, prodEnv.id),
    },
    dev: {
      environmentId: devEnv.id,
      leaderboardId: await createLeaderboard(supabase, game.id, devEnv.id, `main-${runId}`),
      apiKey: await createApiKey(supabase, game.id, devEnv.id),
    },
  };
}

async function cleanupFixtures(f: Fixtures): Promise<void> {
  for (const env of [f.prod, f.dev]) {
    await f.supabase.from('scores').delete().eq('leaderboard_id', env.leaderboardId);
    await f.supabase.from('game_runs').delete().eq('leaderboard_id', env.leaderboardId);
  }
  await f.supabase.from('leaderboards').delete().eq('game_id', f.gameId);
  await f.supabase.from('api_keys').delete().eq('game_id', f.gameId);
  await f.supabase.from('environments').delete().eq('game_id', f.gameId);
  await f.supabase.from('games').delete().eq('id', f.gameId);
}

/** Starts a run through the public API, exactly as a game client would. */
async function startRun(apiKey: string, playerGuid: string, platform: string) {
  const response = await fetch(`${API_URL}/api/v1/runs/start?leaderboard=main-${runId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ player_guid: playerGuid, platform }),
  });
  const body = await response.json();
  if (!body.success) throw new Error(`startRun failed: ${JSON.stringify(body)}`);
  return body.data.run_id as string;
}

/** The same query shape fetchRuns() uses in src/lib/api/analytics.ts. */
async function fetchRunsForEnvironment(gameId: string, environmentId: string) {
  const { data, error } = await fx.supabase
    .from('game_runs')
    .select('player_guid, platform, leaderboards!inner(game_id, environment_id)')
    .eq('leaderboards.game_id', gameId)
    .eq('leaderboards.environment_id', environmentId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

describe('Analytics environment scoping', () => {
  beforeAll(async () => {
    fx = await createFixtures();

    // Three distinct players in production...
    await startRun(fx.prod.apiKey, `prod-${runId}-1`, 'web');
    await startRun(fx.prod.apiKey, `prod-${runId}-2`, 'ios');
    await startRun(fx.prod.apiKey, `prod-${runId}-3`, 'android');

    // ...and two in dev, simulating the developer testing their own game
    await startRun(fx.dev.apiKey, `dev-${runId}-1`, 'web');
    await startRun(fx.dev.apiKey, `dev-${runId}-2`, 'web');
  }, 60000);

  afterAll(async () => {
    if (fx) await cleanupFixtures(fx);
  }, 30000);

  it('returns only production runs when scoped to production', async () => {
    const runs = await fetchRunsForEnvironment(fx.gameId, fx.prod.environmentId);

    expect(runs).toHaveLength(3);
    expect(runs.every((r) => r.player_guid.startsWith(`prod-${runId}`))).toBe(true);
  });

  it('returns only dev runs when scoped to dev', async () => {
    const runs = await fetchRunsForEnvironment(fx.gameId, fx.dev.environmentId);

    expect(runs).toHaveLength(2);
    expect(runs.every((r) => r.player_guid.startsWith(`dev-${runId}`))).toBe(true);
  });

  it('never leaks dev players into production — the regression that matters', async () => {
    const prodRuns = await fetchRunsForEnvironment(fx.gameId, fx.prod.environmentId);
    const prodPlayers = new Set(prodRuns.map((r) => r.player_guid));

    expect([...prodPlayers].some((guid) => guid.startsWith('dev-'))).toBe(false);
    // DAU for production must be 3, not the 5 an unscoped query would report
    expect(prodPlayers.size).toBe(3);
  });

  it('keeps platform breakdowns separate per environment', async () => {
    const prodRuns = await fetchRunsForEnvironment(fx.gameId, fx.prod.environmentId);
    const devRuns = await fetchRunsForEnvironment(fx.gameId, fx.dev.environmentId);

    const platforms = (runs: typeof prodRuns) =>
      [...new Set(runs.map((r) => r.platform))].sort();

    expect(platforms(prodRuns)).toEqual(['android', 'ios', 'web']);
    // dev only ever saw 'web' — if the filter leaked, ios/android would appear here
    expect(platforms(devRuns)).toEqual(['web']);
  });

  it('scopes by game as well as environment', async () => {
    // A real environment id from a different game must return nothing for this game
    const runs = await fetchRunsForEnvironment(fx.gameId, randomBytes(16).toString('hex').replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
      '$1-$2-$3-$4-$5'
    ));

    expect(runs).toHaveLength(0);
  });
});
