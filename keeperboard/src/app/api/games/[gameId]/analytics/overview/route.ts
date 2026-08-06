import {
  resolveScope,
  fetchRuns,
  analyticsErrorResponse,
  dayKey,
  dayRange,
  median,
  uniquePlayers,
  groupBy,
  firstSeenByPlayer,
  type RunRow,
} from '@/lib/api/analytics';

/**
 * GET /api/games/[gameId]/analytics/overview
 *
 * Headline reach and engagement numbers for a game + environment.
 *
 * Query params:
 * - environment_id (required)
 * - from, to (ISO dates; default: last 30 days)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const scope = await resolveScope(request, gameId);

    // Full history: needed to tell new players from returning ones, and for the
    // lifetime total. A player first seen last year is not "new" today.
    const { runs: allRuns, truncated } = await fetchRuns(scope);
    const firstSeen = firstSeenByPlayer(allRuns);

    const windowRuns = allRuns.filter((run) => {
      const at = new Date(run.started_at).getTime();
      return at >= scope.from.getTime() && at <= scope.to.getTime();
    });

    return Response.json({
      range: { from: scope.from.toISOString(), to: scope.to.toISOString() },
      truncated,
      totals: {
        lifetimePlayers: firstSeen.size,
        lifetimeRuns: allRuns.length,
        windowPlayers: uniquePlayers(windowRuns),
        windowRuns: windowRuns.length,
      },
      active: activeCounts(allRuns, scope.to),
      series: dailySeries(windowRuns, firstSeen, scope.from, scope.to),
      platforms: platformBreakdown(windowRuns),
      engagement: engagement(windowRuns),
      scoreHistogram: scoreHistogram(windowRuns),
    });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}

/** DAU / WAU / MAU measured backwards from the end of the window. */
function activeCounts(runs: RunRow[], to: Date) {
  const windowed = (days: number) => {
    const cutoff = to.getTime() - days * 24 * 60 * 60 * 1000;
    return uniquePlayers(
      runs.filter((run) => {
        const at = new Date(run.started_at).getTime();
        return at > cutoff && at <= to.getTime();
      })
    );
  };

  const dau = windowed(1);
  const mau = windowed(30);

  return {
    dau,
    wau: windowed(7),
    mau,
    // Share of monthly players who showed up today. ~20% is strong for a casual game.
    stickiness: mau > 0 ? Math.round((dau / mau) * 1000) / 10 : 0,
  };
}

/** Per-day plays, players, and how many of those players were brand new. */
function dailySeries(
  runs: RunRow[],
  firstSeen: Map<string, string>,
  from: Date,
  to: Date
) {
  const byDay = new Map<string, RunRow[]>();
  for (const run of runs) {
    const day = dayKey(run.started_at);
    const bucket = byDay.get(day);
    if (bucket) bucket.push(run);
    else byDay.set(day, [run]);
  }

  return dayRange(from, to).map((day) => {
    const dayRuns = byDay.get(day) ?? [];
    const players = new Set(dayRuns.map((r) => r.player_guid));
    const newPlayers = [...players].filter((guid) => firstSeen.get(guid) === day);

    return {
      date: day,
      plays: dayRuns.length,
      players: players.size,
      newPlayers: newPlayers.length,
      returningPlayers: players.size - newPlayers.length,
    };
  });
}

function platformBreakdown(runs: RunRow[]) {
  const total = uniquePlayers(runs);

  return [...groupBy(runs, (run) => run.platform).entries()]
    .map(([platform, platformRuns]) => {
      const players = uniquePlayers(platformRuns);
      return {
        platform,
        players,
        plays: platformRuns.length,
        share: total > 0 ? Math.round((players / total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.players - a.players);
}

function engagement(runs: RunRow[]) {
  const finished = runs.filter((run) => run.finished_at !== null);
  const durations = finished
    .map((run) => run.elapsed_seconds)
    .filter((seconds): seconds is number => seconds !== null);

  const players = uniquePlayers(runs);
  const days = new Set(runs.map((run) => dayKey(run.started_at))).size;

  return {
    medianRunSeconds: median(durations),
    longestRunSeconds: durations.length > 0 ? Math.max(...durations) : null,
    // Started but never finished: the player quit mid-game. A real frustration signal,
    // and invisible in `scores`, which only ever sees completed runs.
    abandonRate:
      runs.length > 0
        ? Math.round(((runs.length - finished.length) / runs.length) * 1000) / 10
        : 0,
    runsPerPlayerPerDay:
      players > 0 && days > 0
        ? Math.round((runs.length / players / days) * 10) / 10
        : 0,
  };
}

/** Fixed buckets so the shape is comparable across date ranges. */
const SCORE_BUCKETS = [0, 100, 200, 300, 400, 500, 700, 1000];

function scoreHistogram(runs: RunRow[]) {
  const scores = runs
    .map((run) => run.score)
    .filter((score): score is number => score !== null);

  const buckets = SCORE_BUCKETS.map((floor, index) => {
    const ceiling = SCORE_BUCKETS[index + 1] ?? Infinity;
    return {
      label:
        ceiling === Infinity
          ? `${floor}+`
          : `${floor}–${ceiling}`,
      count: scores.filter((score) => score >= floor && score < ceiling).length,
    };
  });

  return { buckets, median: median(scores) };
}
