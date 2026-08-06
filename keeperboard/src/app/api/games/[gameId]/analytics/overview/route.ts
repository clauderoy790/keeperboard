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
import type { OverviewResponse } from '@/types/analytics';

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

    // Typed so a shape change here is a compile error in the dashboard rather than an
    // `undefined` that only shows up on screen.
    const payload: OverviewResponse = {
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
    };

    return Response.json(payload);
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}

/**
 * DAU / WAU / MAU.
 *
 * DAU is the **last fully elapsed UTC day**, not a rolling 24 hours. A rolling window
 * always includes a partial today, so early in the day DAU collapses toward zero — and
 * because stickiness is DAU ÷ MAU, it drags that down with it. A game averaging 30 players
 * a day would report 2.7% stickiness at breakfast and 20% by midnight, which is worse than
 * useless for a number you'd benchmark against.
 *
 * WAU and MAU stay as rolling windows ending at `to`; one partial day out of 7 or 30
 * barely moves them.
 */
function activeCounts(runs: RunRow[], to: Date) {
  const startOfToDay = new Date(`${dayKey(to)}T00:00:00.000Z`).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const rolling = (days: number) => {
    const cutoff = to.getTime() - days * dayMs;
    return uniquePlayers(
      runs.filter((run) => {
        const at = new Date(run.started_at).getTime();
        return at > cutoff && at <= to.getTime();
      })
    );
  };

  const dau = uniquePlayers(
    runs.filter((run) => {
      const at = new Date(run.started_at).getTime();
      return at >= startOfToDay - dayMs && at < startOfToDay;
    })
  );

  const mau = rolling(30);

  return {
    dau,
    wau: rolling(7),
    mau,
    // Share of monthly players active on a typical day. ~20% is strong for a casual game.
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

  // Divided by distinct player-days, not by every player × every day in the range.
  // Players don't play daily, so dividing by the calendar would average across all the
  // days each player wasn't there and drive the figure toward zero — it would read as
  // "0.1 runs per player per day" for a game people actually play several times a sitting.
  // This answers the useful question instead: when someone does play, how many runs?
  const playerDays = new Set(
    runs.map((run) => `${run.player_guid}|${dayKey(run.started_at)}`)
  ).size;

  return {
    medianRunSeconds: median(durations),
    longestRunSeconds: durations.length > 0 ? Math.max(...durations) : null,
    // Started but never finished: the player quit mid-game. A real frustration signal,
    // and invisible in `scores`, which only ever sees completed runs.
    abandonRate:
      runs.length > 0
        ? Math.round(((runs.length - finished.length) / runs.length) * 1000) / 10
        : 0,
    runsPerActiveDay:
      playerDays > 0 ? Math.round((runs.length / playerDays) * 10) / 10 : 0,
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
