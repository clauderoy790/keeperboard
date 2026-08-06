import { describe, it, expect } from 'vitest';
import {
  dayKey,
  dayOffset,
  median,
  uniquePlayers,
  dayRange,
  groupBy,
  firstSeenByPlayer,
  runDayOffsets,
  retentionAtDay,
  retainedAtDay,
  weekKey,
  type RunRow,
} from './analytics';

/**
 * Unit tests for the analytics aggregation primitives.
 *
 * The retention maths is where mistakes are silent — a wrong cohort boundary produces a
 * plausible-looking number rather than an error — so it gets the most coverage.
 */

function run(overrides: Partial<RunRow> & { player_guid: string; started_at: string }): RunRow {
  return {
    finished_at: overrides.started_at,
    elapsed_seconds: 120,
    score: 500,
    used: true,
    platform: 'web',
    country: 'US',
    game_version: '1.0.0',
    source: null,
    ...overrides,
  };
}

describe('dayKey / dayOffset', () => {
  it('reduces a timestamp to a UTC day', () => {
    expect(dayKey('2026-08-06T23:59:59Z')).toBe('2026-08-06');
    expect(dayKey('2026-08-06T00:00:00Z')).toBe('2026-08-06');
  });

  it('counts whole days between timestamps', () => {
    expect(dayOffset('2026-08-01T10:00:00Z', '2026-08-02T09:00:00Z')).toBe(1);
    expect(dayOffset('2026-08-01T00:00:00Z', '2026-08-08T23:00:00Z')).toBe(7);
  });

  it('ignores time of day — a run at 23:59 and one at 00:01 are different days', () => {
    expect(dayOffset('2026-08-01T23:59:00Z', '2026-08-02T00:01:00Z')).toBe(1);
  });
});

describe('median', () => {
  it('handles odd and even counts', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(3); // rounded from 2.5
  });

  it('returns null for no data rather than 0, which would read as a real measurement', () => {
    expect(median([])).toBeNull();
  });
});

describe('uniquePlayers', () => {
  it('counts distinct guids, not runs', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-01T11:00:00Z' }),
      run({ player_guid: 'b', started_at: '2026-08-01T12:00:00Z' }),
    ];
    expect(uniquePlayers(runs)).toBe(2);
  });
});

describe('dayRange', () => {
  it('is inclusive of both ends', () => {
    const days = dayRange(new Date('2026-08-01T12:00:00Z'), new Date('2026-08-04T03:00:00Z'));
    expect(days).toEqual(['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04']);
  });

  it('returns a single day when from and to share a date', () => {
    const days = dayRange(new Date('2026-08-01T00:00:00Z'), new Date('2026-08-01T23:00:00Z'));
    expect(days).toEqual(['2026-08-01']);
  });
});

describe('groupBy', () => {
  it('buckets nulls under "unknown" instead of dropping them', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z', platform: 'ios' }),
      run({ player_guid: 'b', started_at: '2026-08-01T10:00:00Z', platform: null }),
    ];
    const grouped = groupBy(runs, (r) => r.platform);

    expect(grouped.get('ios')).toHaveLength(1);
    expect(grouped.get('unknown')).toHaveLength(1);
  });
});

describe('firstSeenByPlayer', () => {
  it('takes the earliest day per player regardless of input order', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-05T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'b', started_at: '2026-08-03T10:00:00Z' }),
    ];
    const firstSeen = firstSeenByPlayer(runs);

    expect(firstSeen.get('a')).toBe('2026-08-01');
    expect(firstSeen.get('b')).toBe('2026-08-03');
  });
});

describe('retention', () => {
  const now = new Date('2026-09-30T00:00:00Z');

  it('counts a player who returned exactly on day 1', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-02T10:00:00Z' }),
    ];
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);

    expect(retentionAtDay(['a'], offsets, 1, '2026-08-01', now)).toBe(100);
  });

  it('is rolling — a return on day 3 counts toward D1 and D3, but not D7', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-04T10:00:00Z' }),
    ];
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);

    // "Still active on day N or later" — day 3 satisfies D1 and D3, not D7
    expect(retentionAtDay(['a'], offsets, 1, '2026-08-01', now)).toBe(100);
    expect(retentionAtDay(['a'], offsets, 3, '2026-08-01', now)).toBe(100);
    expect(retentionAtDay(['a'], offsets, 7, '2026-08-01', now)).toBe(0);
  });

  it('counts a player once no matter how many times they return', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-02T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-05T10:00:00Z' }),
    ];
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);

    expect(retentionAtDay(['a'], offsets, 1, '2026-08-01', now)).toBe(100);
  });

  it('decreases with N, the shape every retention table is read against', () => {
    // Guards both rejected definitions: exact-day gave D30 = 0% while D7 was non-zero,
    // and cumulative made the curve rise, which reads as a bug.
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-03T10:00:00Z' }),
      run({ player_guid: 'b', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'b', started_at: '2026-09-05T10:00:00Z' }),
      run({ player_guid: 'c', started_at: '2026-08-01T10:00:00Z' }),
    ];
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);
    const cohort = ['a', 'b', 'c'];

    const d1 = retentionAtDay(cohort, offsets, 1, '2026-08-01', now)!;
    const d7 = retentionAtDay(cohort, offsets, 7, '2026-08-01', now)!;
    const d30 = retentionAtDay(cohort, offsets, 30, '2026-08-01', now)!;

    expect(d1).toBeGreaterThanOrEqual(d7);
    expect(d7).toBeGreaterThanOrEqual(d30);

    // a and b both returned at some point; only b was still around past day 30
    expect(d1).toBeCloseTo(66.7, 0);
    expect(d30).toBeCloseTo(33.3, 0);
  });

  it('reports a mixed cohort as a percentage', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-02T10:00:00Z' }),
      run({ player_guid: 'b', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'c', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'd', started_at: '2026-08-01T10:00:00Z' }),
    ];
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);

    expect(retentionAtDay(['a', 'b', 'c', 'd'], offsets, 1, '2026-08-01', now)).toBe(25);
  });

  it('returns null when the window has not elapsed — a young cohort is unmeasurable, not 0%', () => {
    const runs = [run({ player_guid: 'a', started_at: '2026-09-29T10:00:00Z' })];
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);

    // Only one day has passed, so D7 cannot be known yet
    expect(retentionAtDay(['a'], offsets, 7, '2026-09-29', now)).toBeNull();
    // ...but D1 can
    expect(retentionAtDay(['a'], offsets, 1, '2026-09-29', now)).toBe(0);
  });

  it('returns null for an empty cohort rather than dividing by zero', () => {
    expect(retentionAtDay([], new Map(), 1, '2026-08-01', now)).toBeNull();
  });

  it('does not count the first-day run itself as a return', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T09:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-01T22:00:00Z' }),
    ];
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);

    expect(retentionAtDay(['a'], offsets, 1, '2026-08-01', now)).toBe(0);
  });
});

describe('retainedAtDay', () => {
  it('is true when the player was active on that day or later', () => {
    expect(retainedAtDay(new Set([0, 12]), 7)).toBe(true);
    expect(retainedAtDay(new Set([0, 7]), 7)).toBe(true);
  });

  it('is false when they never made it that far', () => {
    expect(retainedAtDay(new Set([0, 3]), 7)).toBe(false);
    expect(retainedAtDay(new Set([0]), 1)).toBe(false);
  });

  it('handles a player with no recorded offsets', () => {
    expect(retainedAtDay(undefined, 1)).toBe(false);
  });
});

describe('engagement rate denominators', () => {
  /**
   * Mirrors the runsPerActiveDay calculation in the overview route. Guards the bug where
   * dividing by every player × every calendar day drove the figure to ~0.1 for a game
   * people play several times a sitting.
   */
  function runsPerActiveDay(runs: RunRow[]): number {
    const playerDays = new Set(
      runs.map((r) => `${r.player_guid}|${dayKey(r.started_at)}`)
    ).size;
    return playerDays > 0 ? Math.round((runs.length / playerDays) * 10) / 10 : 0;
  }

  it('averages over days played, not the whole calendar', () => {
    // One player, 6 runs, all on a single day inside a long range
    const runs = Array.from({ length: 6 }, (_, i) =>
      run({ player_guid: 'a', started_at: `2026-08-01T1${i}:00:00Z` })
    );

    // 6 runs ÷ 1 player-day = 6, not 6 ÷ 1 player ÷ 30 calendar days = 0.2
    expect(runsPerActiveDay(runs)).toBe(6);
  });

  it('counts each player-day once across multiple players', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-01T11:00:00Z' }),
      run({ player_guid: 'b', started_at: '2026-08-02T10:00:00Z' }),
      run({ player_guid: 'b', started_at: '2026-08-02T11:00:00Z' }),
    ];
    // 4 runs over 2 player-days
    expect(runsPerActiveDay(runs)).toBe(2);
  });

  it('returns 0 with no runs rather than dividing by zero', () => {
    expect(runsPerActiveDay([])).toBe(0);
  });
});

describe('daily active window', () => {
  /** Mirrors the DAU calculation: the last fully elapsed UTC day, never a partial today. */
  function dau(runs: RunRow[], to: Date): number {
    const startOfToDay = new Date(`${dayKey(to)}T00:00:00.000Z`).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    return uniquePlayers(
      runs.filter((r) => {
        const at = new Date(r.started_at).getTime();
        return at >= startOfToDay - dayMs && at < startOfToDay;
      })
    );
  }

  it('measures yesterday, so a quiet morning does not read as a collapse', () => {
    const runs = [
      // Yesterday: three players
      run({ player_guid: 'a', started_at: '2026-08-05T10:00:00Z' }),
      run({ player_guid: 'b', started_at: '2026-08-05T18:00:00Z' }),
      run({ player_guid: 'c', started_at: '2026-08-05T23:00:00Z' }),
      // Today, barely started: one player
      run({ player_guid: 'd', started_at: '2026-08-06T00:30:00Z' }),
    ];

    // 08:00 on the 6th — a rolling 24h window would report 1
    expect(dau(runs, new Date('2026-08-06T08:00:00Z'))).toBe(3);
  });

  it('excludes today entirely, however late in the day', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-05T10:00:00Z' }),
      run({ player_guid: 'b', started_at: '2026-08-06T23:00:00Z' }),
    ];
    expect(dau(runs, new Date('2026-08-06T23:59:00Z'))).toBe(1);
  });
});

describe('weekKey', () => {
  it('snaps to the preceding Monday', () => {
    expect(weekKey('2026-08-06')).toBe('2026-08-03'); // Thursday → Monday
    expect(weekKey('2026-08-03')).toBe('2026-08-03'); // Monday → itself
  });

  it('treats Sunday as the end of the week, not the start', () => {
    expect(weekKey('2026-08-09')).toBe('2026-08-03'); // Sunday → that week's Monday
  });
});
