import {
  resolveScope,
  fetchRuns,
  analyticsErrorResponse,
  median,
  firstSeenByPlayer,
  runDayOffsets,
  retainedAtDay,
  type RunRow,
} from '@/lib/api/analytics';
import type { AcquisitionResponse } from '@/types/analytics';

/**
 * GET /api/games/[gameId]/analytics/acquisition
 *
 * Where players came from, and — more usefully — whether they stayed.
 *
 * Source comes from the `?ref=` tag on the link a player first arrived through, captured
 * once by the SDK and attached to every run afterwards. Two consequences shape this
 * endpoint:
 *
 * - **Web only.** An app installed from a store launches with no URL, so those players can
 *   never carry a source. They are reported as `app-install`, not lumped into `direct`,
 *   because "we cannot know" is a different fact from "they typed the URL".
 * - **Untagged web arrivals are `direct`.** We deliberately don't fall back to
 *   `document.referrer`; Reddit and in-app browsers strip it, so it would produce
 *   confidently wrong attribution rather than an honest gap.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const scope = await resolveScope(request, gameId);

    // Full history — D7 needs a week to have elapsed since each player arrived.
    const { runs, truncated } = await fetchRuns(scope);
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);

    const sources = sourceBreakdown(runs, firstSeen, offsets, scope.to);

    const payload: AcquisitionResponse = {
      range: { from: scope.from.toISOString(), to: scope.to.toISOString() },
      truncated,
      sources,
      // Share of web players who arrived through a tagged link. When this is low, the
      // rest of this page is describing a small slice — tag more links.
      taggedCoverage: taggedCoverage(sources),
    };

    return Response.json(payload);
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}

function sourceBreakdown(
  runs: RunRow[],
  firstSeen: Map<string, string>,
  offsets: Map<string, Set<number>>,
  now: Date
) {
  // First-touch: a player's source is fixed at their first run and never reassigned.
  const sourceByPlayer = new Map<string, string>();
  const platformByPlayer = new Map<string, string>();

  for (const run of runs) {
    if (!sourceByPlayer.has(run.player_guid)) {
      const platform = run.platform ?? 'unknown';
      platformByPlayer.set(run.player_guid, platform);

      sourceByPlayer.set(
        run.player_guid,
        run.source ?? (isAppPlatform(platform) ? 'app-install' : 'direct')
      );
    }
  }

  const runsByPlayer = new Map<string, RunRow[]>();
  for (const run of runs) {
    const bucket = runsByPlayer.get(run.player_guid);
    if (bucket) bucket.push(run);
    else runsByPlayer.set(run.player_guid, [run]);
  }

  const grouped = new Map<string, string[]>();
  for (const [guid, source] of sourceByPlayer) {
    const bucket = grouped.get(source);
    if (bucket) bucket.push(guid);
    else grouped.set(source, [guid]);
  }

  return [...grouped.entries()]
    .map(([source, players]) => {
      const eligible = players.filter((guid) => {
        const first = firstSeen.get(guid);
        return first ? daysBetween(first, now) >= 7 : false;
      });
      const returned = eligible.filter((guid) => retainedAtDay(offsets.get(guid), 7)).length;

      const durations = players
        .flatMap((guid) => runsByPlayer.get(guid) ?? [])
        .map((run) => run.elapsed_seconds)
        .filter((seconds): seconds is number => seconds !== null);

      const d7 =
        eligible.length > 0 ? Math.round((returned / eligible.length) * 1000) / 10 : null;

      return {
        source,
        players: players.length,
        plays: players.reduce((sum, guid) => sum + (runsByPlayer.get(guid)?.length ?? 0), 0),
        d7,
        // Players still active a week later — the number that actually compares channels.
        // A source sending 3x the traffic at a third the retention is a wash.
        retainedPlayers: d7 !== null ? Math.round((d7 / 100) * eligible.length) : null,
        medianRunSeconds: median(durations),
        attributable: source !== 'app-install',
      };
    })
    .sort((a, b) => b.players - a.players);
}

function isAppPlatform(platform: string): boolean {
  return platform === 'ios' || platform === 'android';
}

/**
 * What share of reachable players arrived through a tagged link.
 *
 * The denominator is everything except known app installs — which means it includes
 * unknown-platform players from before SDK 2.3.0. Calling those "web" would assert
 * something we cannot know; they may well have been app installs.
 */
function taggedCoverage(sources: ReturnType<typeof sourceBreakdown>) {
  const reachable = sources.filter((entry) => entry.attributable);
  const total = reachable.reduce((sum, entry) => sum + entry.players, 0);
  const tagged = reachable
    .filter((entry) => entry.source !== 'direct')
    .reduce((sum, entry) => sum + entry.players, 0);

  return {
    taggedPlayers: tagged,
    attributablePlayers: total,
    percent: total > 0 ? Math.round((tagged / total) * 1000) / 10 : 0,
  };
}

function daysBetween(day: string, to: Date): number {
  const start = new Date(day).getTime();
  const end = new Date(to.toISOString().slice(0, 10)).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000));
}
