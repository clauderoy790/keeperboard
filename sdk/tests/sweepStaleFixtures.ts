/**
 * Safety net for integration test fixtures.
 *
 * Each integration suite deletes its own game in `afterAll`, which covers assertion
 * failures. It does not cover a process that dies before teardown — Ctrl-C, a crashed
 * dev server, a killed CI job. When that happens the throwaway game is orphaned in the
 * database with its leaderboard, API key and scores still attached.
 *
 * This sweep runs once before every integration run and removes fixtures left behind by
 * *previous* runs, so an interrupted run heals itself the next time tests are run rather
 * than accumulating silently. (One such orphan survived five months before being noticed.)
 *
 * Two guards keep this safe against real data:
 *   1. Name must start with one of the exact prefixes the suites generate.
 *   2. Row must be older than MIN_AGE_MS, so a concurrently running suite — or another
 *      developer's run against the same database — is never touched.
 *
 * Deletes are always keyed to a resolved game id, never to a name pattern.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Exact prefixes used by the integration suites. Keep in sync when adding a suite. */
const FIXTURE_PREFIXES = [
  'SDK Test Game ',
  'Anti-Cheat Test Game ',
  'Platform Test Game ',
] as const;

/** Only sweep fixtures older than this, so in-flight runs are never disturbed. */
const MIN_AGE_MS = 60 * 60 * 1000; // 1 hour

export interface SweepResult {
  scanned: number;
  removed: string[];
}

/**
 * Deletes one game and everything hanging off it, in FK-safe order.
 *
 * scores.run_id references game_runs with no ON DELETE clause, so scores must be
 * removed before game_runs or the delete errors.
 */
async function deleteGameCascade(db: SupabaseClient, gameId: string): Promise<void> {
  const { data: leaderboards } = await db
    .from('leaderboards')
    .select('id')
    .eq('game_id', gameId);

  for (const { id } of leaderboards ?? []) {
    await db.from('scores').delete().eq('leaderboard_id', id);
    await db.from('game_runs').delete().eq('leaderboard_id', id);
  }

  await db.from('leaderboards').delete().eq('game_id', gameId);
  await db.from('api_keys').delete().eq('game_id', gameId);
  await db.from('environments').delete().eq('game_id', gameId);
  await db.from('games').delete().eq('id', gameId);
}

/**
 * Removes integration fixtures orphaned by earlier runs.
 * Silently does nothing when Supabase credentials are absent.
 */
export async function sweepStaleFixtures(): Promise<SweepResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) return { scanned: 0, removed: [] };

  const db = createClient(url, key);
  const cutoff = new Date(Date.now() - MIN_AGE_MS).toISOString();

  const { data: games, error } = await db
    .from('games')
    .select('id, name, created_at')
    .lt('created_at', cutoff);

  if (error || !games) return { scanned: 0, removed: [] };

  const orphans = games.filter((game) =>
    FIXTURE_PREFIXES.some((prefix) => game.name.startsWith(prefix))
  );

  for (const orphan of orphans) {
    await deleteGameCascade(db, orphan.id);
  }

  return { scanned: games.length, removed: orphans.map((o) => o.name) };
}
