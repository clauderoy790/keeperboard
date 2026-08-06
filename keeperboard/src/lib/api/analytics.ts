/**
 * Shared data access and aggregation for the dashboard analytics endpoints.
 *
 * Everything here is scoped to a **game + environment**. That pairing is the correct grain:
 * a player GUID is one per install and shared across every leaderboard in a game, so
 * aggregating per-leaderboard would double-count anyone who plays two boards. Scoping to
 * an environment keeps dev testing out of production numbers.
 *
 * All metrics read `game_runs`, not `scores`. `scores` holds one row per player, written
 * only when they beat their own best, and is pruned on version reset — it cannot answer
 * "how many people played on Tuesday". `game_runs` is one row per session and survives
 * resets.
 *
 * Aggregation happens in JS rather than SQL. At current volume (~3.3k runs over six months)
 * this is instant and far easier to change than a set of database functions. See
 * MAX_ROWS below for where that stops being true.
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Supabase caps a single select at 1000 rows; we page through in chunks of this size. */
const PAGE_SIZE = 1000;

/**
 * Safety valve. If a single environment ever exceeds this, the response is flagged
 * `truncated` rather than silently reporting wrong numbers, and it's time to move these
 * aggregations into SQL.
 */
const MAX_ROWS = 200_000;

const DAY_MS = 24 * 60 * 60 * 1000;

// =============================================
// Types
// =============================================

export interface RunRow {
  player_guid: string;
  started_at: string;
  finished_at: string | null;
  elapsed_seconds: number | null;
  score: number | null;
  used: boolean;
  platform: string | null;
  country: string | null;
  game_version: string | null;
  source: string | null;
}

export interface AnalyticsScope {
  gameId: string;
  environmentId: string;
  from: Date;
  to: Date;
}

export class AnalyticsError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

// =============================================
// Authorization & scope
// =============================================

/**
 * Verifies the caller owns the game and that the environment belongs to it, then resolves
 * the date range.
 *
 * @throws {AnalyticsError} with an appropriate HTTP status.
 */
export async function resolveScope(
  request: Request,
  gameId: string
): Promise<AnalyticsScope> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AnalyticsError('Unauthorized', 401);
  }

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .single();

  if (!game) {
    throw new AnalyticsError('Game not found', 404);
  }

  const { searchParams } = new URL(request.url);
  const environmentId = searchParams.get('environment_id');

  if (!environmentId) {
    throw new AnalyticsError('Missing required query param: environment_id', 400);
  }

  // The environment must belong to this game — otherwise a valid environment id from
  // someone else's game would leak their data through an owned gameId.
  const { data: environment } = await supabase
    .from('environments')
    .select('id')
    .eq('id', environmentId)
    .eq('game_id', gameId)
    .single();

  if (!environment) {
    throw new AnalyticsError('Environment not found for this game', 404);
  }

  const to = parseDate(searchParams.get('to')) ?? new Date();
  const from =
    parseDate(searchParams.get('from')) ?? new Date(to.getTime() - 30 * DAY_MS);

  if (from > to) {
    throw new AnalyticsError('`from` must be before `to`', 400);
  }

  return { gameId, environmentId, from, to };
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// =============================================
// Data access
// =============================================

const RUN_COLUMNS =
  'player_guid, started_at, finished_at, elapsed_seconds, score, used, platform, country, game_version, source, leaderboards!inner(game_id, environment_id)';

/**
 * Fetches runs for a game + environment, paging past Supabase's 1000-row select cap.
 *
 * @param since optional lower bound on started_at. Omit to fetch all history — needed for
 *   retention, where a player's first-ever run may predate the reporting window.
 */
export async function fetchRuns(
  scope: AnalyticsScope,
  options: { since?: Date; until?: Date } = {}
): Promise<{ runs: RunRow[]; truncated: boolean }> {
  const admin = createAdminClient();
  const runs: RunRow[] = [];

  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    let query = admin
      .from('game_runs')
      .select(RUN_COLUMNS)
      .eq('leaderboards.game_id', scope.gameId)
      .eq('leaderboards.environment_id', scope.environmentId)
      .order('started_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (options.since) query = query.gte('started_at', options.since.toISOString());
    if (options.until) query = query.lte('started_at', options.until.toISOString());

    const { data, error } = await query;

    // Supabase errors aren't serializable across the server/client boundary
    if (error) throw new Error(`Failed to load runs: ${error.message}`);
    if (!data || data.length === 0) break;

    runs.push(...(data as unknown as RunRow[]));

    if (data.length < PAGE_SIZE) return { runs, truncated: false };
  }

  return { runs, truncated: true };
}

// =============================================
// Aggregation helpers
// =============================================

/** UTC day key, e.g. "2026-08-06". */
export function dayKey(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

/** Whole days between two instants, floored. */
export function dayOffset(from: Date | string, to: Date | string): number {
  const a = new Date(dayKey(from)).getTime();
  const b = new Date(dayKey(to)).getTime();
  return Math.floor((b - a) / DAY_MS);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

/** Distinct player count. */
export function uniquePlayers(runs: RunRow[]): number {
  return new Set(runs.map((r) => r.player_guid)).size;
}

/** Every UTC day between two dates inclusive, as day keys. */
export function dayRange(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(dayKey(from));
  const last = dayKey(to);

  while (dayKey(cursor) <= last) {
    days.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/**
 * Groups runs by a nullable dimension, bucketing nulls under "unknown".
 *
 * Nulls are expected and permanent for historical data: every run before SDK 2.3.0 has no
 * platform, and app installs can never carry a source. Dropping them would misrepresent
 * totals, so they get their own bucket instead.
 */
export function groupBy(
  runs: RunRow[],
  key: (run: RunRow) => string | null
): Map<string, RunRow[]> {
  const groups = new Map<string, RunRow[]>();

  for (const run of runs) {
    const value = key(run) ?? 'unknown';
    const bucket = groups.get(value);
    if (bucket) bucket.push(run);
    else groups.set(value, [run]);
  }
  return groups;
}

/**
 * Maps each player to the day they were first seen, across all supplied runs.
 * Callers must pass full history, not just the reporting window, or cohorts will treat
 * long-standing players as new.
 */
export function firstSeenByPlayer(runs: RunRow[]): Map<string, string> {
  const firstSeen = new Map<string, string>();

  for (const run of runs) {
    const day = dayKey(run.started_at);
    const existing = firstSeen.get(run.player_guid);
    if (!existing || day < existing) firstSeen.set(run.player_guid, day);
  }
  return firstSeen;
}

/**
 * Classic day-N retention: of players first seen on a day, the share with a run exactly N
 * days later. Not rolling retention — "came back on day 7", not "came back by day 7".
 *
 * @returns null when the window hasn't fully elapsed for this cohort yet, so a young
 *   cohort reads as "not measurable" rather than as 0%.
 */
export function retentionAtDay(
  cohortPlayers: string[],
  runDaysByPlayer: Map<string, Set<number>>,
  day: number,
  cohortStart: string,
  now: Date
): number | null {
  if (cohortPlayers.length === 0) return null;
  if (dayOffset(cohortStart, now) < day) return null;

  const returned = cohortPlayers.filter((guid) =>
    runDaysByPlayer.get(guid)?.has(day)
  ).length;

  return Math.round((returned / cohortPlayers.length) * 1000) / 10;
}

/** Day offsets on which each player has at least one run, relative to their first day. */
export function runDayOffsets(
  runs: RunRow[],
  firstSeen: Map<string, string>
): Map<string, Set<number>> {
  const offsets = new Map<string, Set<number>>();

  for (const run of runs) {
    const first = firstSeen.get(run.player_guid);
    if (!first) continue;

    const offset = dayOffset(first, run.started_at);
    const set = offsets.get(run.player_guid);
    if (set) set.add(offset);
    else offsets.set(run.player_guid, new Set([offset]));
  }
  return offsets;
}

/** Monday-based week key for a day, e.g. "2026-08-03". */
export function weekKey(day: string): string {
  const date = new Date(day);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - weekday);
  return dayKey(date);
}

/** Wraps a handler so AnalyticsError becomes its status and anything else becomes a 500. */
export function analyticsErrorResponse(error: unknown): Response {
  if (error instanceof AnalyticsError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error('Analytics error:', error);
  return Response.json({ error: 'Failed to load analytics' }, { status: 500 });
}
