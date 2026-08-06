import {
  resolveScope,
  fetchRuns,
  analyticsErrorResponse,
  uniquePlayers,
  groupBy,
  median,
  firstSeenByPlayer,
  runDayOffsets,
  type RunRow,
} from '@/lib/api/analytics';

/**
 * GET /api/games/[gameId]/analytics/audience
 *
 * Who is playing and when: hour-of-week activity, countries, and game versions.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const scope = await resolveScope(request, gameId);

    // Version retention needs full history; the rest is windowed.
    const { runs: allRuns, truncated } = await fetchRuns(scope);
    const windowRuns = allRuns.filter((run) => {
      const at = new Date(run.started_at).getTime();
      return at >= scope.from.getTime() && at <= scope.to.getTime();
    });

    return Response.json({
      range: { from: scope.from.toISOString(), to: scope.to.toISOString() },
      truncated,
      heatmap: activityHeatmap(windowRuns),
      countries: countryBreakdown(windowRuns),
      versions: versionBreakdown(allRuns, scope.to),
    });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}

/**
 * Plays per weekday × hour, in UTC.
 *
 * Returned as a flat array of 168 cells so the client doesn't have to reason about nested
 * array indexing. `weekday` is 0 = Monday.
 *
 * Note this is UTC, not player-local time — we store timestamps, not offsets. For a game
 * with a geographically concentrated audience it's a good proxy; for a globally spread one
 * it smears. The country breakdown is the honest check on how much to trust it.
 */
function activityHeatmap(runs: RunRow[]) {
  const cells = new Map<string, number>();
  let peak = 0;

  for (const run of runs) {
    const date = new Date(run.started_at);
    const weekday = (date.getUTCDay() + 6) % 7;
    const hour = date.getUTCHours();
    const key = `${weekday}:${hour}`;

    const next = (cells.get(key) ?? 0) + 1;
    cells.set(key, next);
    if (next > peak) peak = next;
  }

  const grid = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour < 24; hour++) {
      grid.push({
        weekday,
        hour,
        plays: cells.get(`${weekday}:${hour}`) ?? 0,
      });
    }
  }

  return { cells: grid, peak, timezone: 'UTC' };
}

function countryBreakdown(runs: RunRow[]) {
  const total = uniquePlayers(runs);

  return [...groupBy(runs, (run) => run.country).entries()]
    .map(([country, countryRuns]) => {
      const players = uniquePlayers(countryRuns);
      return {
        country,
        players,
        plays: countryRuns.length,
        share: total > 0 ? Math.round((players / total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.players - a.players);
}

/**
 * Players, session length and D7 per game version.
 *
 * The question this answers is "did the update help?" — and the honest version of that is
 * "among players actually running it". On iOS and Android players update on their own
 * schedule, so several versions are live at once and a blended number tells you nothing.
 */
function versionBreakdown(runs: RunRow[], now: Date) {
  const firstSeen = firstSeenByPlayer(runs);
  const offsets = runDayOffsets(runs, firstSeen);

  // Attribute a player to the last version they were seen on — that's the build whose
  // retention you're actually measuring going forward.
  const versionByPlayer = new Map<string, string>();
  for (const run of runs) {
    versionByPlayer.set(run.player_guid, run.game_version ?? 'unknown');
  }

  const grouped = groupBy(runs, (run) => versionByPlayer.get(run.player_guid) ?? null);

  return [...grouped.entries()]
    .map(([version, versionRuns]) => {
      const players = [...versionByPlayer.entries()]
        .filter(([, playerVersion]) => playerVersion === version)
        .map(([guid]) => guid);

      const eligible = players.filter((guid) => {
        const first = firstSeen.get(guid);
        return first ? daysBetween(first, now) >= 7 : false;
      });

      const returned = eligible.filter((guid) => offsets.get(guid)?.has(7)).length;

      const durations = versionRuns
        .map((run) => run.elapsed_seconds)
        .filter((seconds): seconds is number => seconds !== null);

      return {
        version,
        players: players.length,
        plays: versionRuns.length,
        medianRunSeconds: median(durations),
        d7: eligible.length > 0 ? Math.round((returned / eligible.length) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => b.players - a.players);
}

function daysBetween(day: string, to: Date): number {
  const start = new Date(day).getTime();
  const end = new Date(to.toISOString().slice(0, 10)).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}
