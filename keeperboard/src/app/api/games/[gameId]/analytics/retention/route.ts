import {
  resolveScope,
  fetchRuns,
  analyticsErrorResponse,
  firstSeenByPlayer,
  runDayOffsets,
  retentionAtDay,
  weekKey,
  groupBy,
  type RunRow,
} from '@/lib/api/analytics';

/**
 * GET /api/games/[gameId]/analytics/retention
 *
 * Weekly cohorts and per-platform retention curves.
 *
 * Retention is the metric that tells you whether traffic you acquire is worth acquiring —
 * volume without return visits is a bounce, not an audience.
 *
 * Always computed over full history regardless of the requested range: a cohort's D30 can
 * only be measured 30 days after that cohort started, so windowing the source data would
 * silently drop measurable cohorts.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const scope = await resolveScope(request, gameId);

    const { runs, truncated } = await fetchRuns(scope);
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);
    const now = scope.to;

    return Response.json({
      range: { from: scope.from.toISOString(), to: scope.to.toISOString() },
      truncated,
      overall: overallRetention(firstSeen, offsets, now),
      cohorts: weeklyCohorts(firstSeen, offsets, now),
      byPlatform: platformCurves(runs, firstSeen, offsets, now),
    });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}

const MILESTONES = [1, 7, 30] as const;
const CURVE_DAYS = [0, 1, 3, 7, 14, 30] as const;

/**
 * Retention across every player, restricted per-milestone to cohorts old enough to
 * measure. Without that restriction, players who joined yesterday would count as "not
 * retained at D30" and drag the number toward zero.
 */
function overallRetention(
  firstSeen: Map<string, string>,
  offsets: Map<string, Set<number>>,
  now: Date
) {
  const result: Record<string, number | null> = {};

  for (const day of MILESTONES) {
    const eligible = [...firstSeen.entries()].filter(
      ([, first]) => daysBetween(first, now) >= day
    );

    if (eligible.length === 0) {
      result[`d${day}`] = null;
      continue;
    }

    const returned = eligible.filter(([guid]) => offsets.get(guid)?.has(day)).length;
    result[`d${day}`] = Math.round((returned / eligible.length) * 1000) / 10;
  }

  return result;
}

function weeklyCohorts(
  firstSeen: Map<string, string>,
  offsets: Map<string, Set<number>>,
  now: Date
) {
  const cohorts = new Map<string, string[]>();

  for (const [guid, first] of firstSeen) {
    const week = weekKey(first);
    const bucket = cohorts.get(week);
    if (bucket) bucket.push(guid);
    else cohorts.set(week, [guid]);
  }

  return [...cohorts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, players]) => ({
      cohortStart: week,
      players: players.length,
      // Measured from the end of the cohort week — the youngest player in it — so a
      // milestone is never reported before every member has had the chance to hit it.
      d1: retentionAtDay(players, offsets, 1, addDays(week, 6), now),
      d7: retentionAtDay(players, offsets, 7, addDays(week, 6), now),
      d30: retentionAtDay(players, offsets, 30, addDays(week, 6), now),
    }))
    .slice(-12); // Last 12 weeks keeps the table readable
}

/**
 * Retention curve per platform. This is where the platform dimension earns its keep:
 * web typically brings volume while app installs bring retention, and the two point in
 * opposite directions for marketing.
 */
function platformCurves(
  runs: RunRow[],
  firstSeen: Map<string, string>,
  offsets: Map<string, Set<number>>,
  now: Date
) {
  // A player's platform is fixed per install, so their first run defines it.
  const platformByPlayer = new Map<string, string>();
  for (const run of runs) {
    if (!platformByPlayer.has(run.player_guid)) {
      platformByPlayer.set(run.player_guid, run.platform ?? 'unknown');
    }
  }

  const byPlatform = groupBy(runs, (run) => platformByPlayer.get(run.player_guid) ?? null);

  return [...byPlatform.keys()]
    .map((platform) => {
      const players = [...firstSeen.keys()].filter(
        (guid) => platformByPlayer.get(guid) === platform
      );

      return {
        platform,
        players: players.length,
        curve: CURVE_DAYS.map((day) => ({
          day,
          value:
            day === 0
              ? 100
              : retentionAtDayForPlayers(players, firstSeen, offsets, day, now),
        })),
      };
    })
    .sort((a, b) => b.players - a.players);
}

function retentionAtDayForPlayers(
  players: string[],
  firstSeen: Map<string, string>,
  offsets: Map<string, Set<number>>,
  day: number,
  now: Date
): number | null {
  const eligible = players.filter(
    (guid) => daysBetween(firstSeen.get(guid)!, now) >= day
  );
  if (eligible.length === 0) return null;

  const returned = eligible.filter((guid) => offsets.get(guid)?.has(day)).length;
  return Math.round((returned / eligible.length) * 1000) / 10;
}

function daysBetween(day: string, to: Date): number {
  const start = new Date(day).getTime();
  const end = new Date(to.toISOString().slice(0, 10)).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}

function addDays(day: string, days: number): string {
  const date = new Date(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
