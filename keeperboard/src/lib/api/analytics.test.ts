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

  it('is day-N exact, not rolling — returning on day 2 is not D1 retention', () => {
    const runs = [
      run({ player_guid: 'a', started_at: '2026-08-01T10:00:00Z' }),
      run({ player_guid: 'a', started_at: '2026-08-03T10:00:00Z' }),
    ];
    const firstSeen = firstSeenByPlayer(runs);
    const offsets = runDayOffsets(runs, firstSeen);

    expect(retentionAtDay(['a'], offsets, 1, '2026-08-01', now)).toBe(0);
    expect(retentionAtDay(['a'], offsets, 2, '2026-08-01', now)).toBe(100);
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

describe('weekKey', () => {
  it('snaps to the preceding Monday', () => {
    expect(weekKey('2026-08-06')).toBe('2026-08-03'); // Thursday → Monday
    expect(weekKey('2026-08-03')).toBe('2026-08-03'); // Monday → itself
  });

  it('treats Sunday as the end of the week, not the start', () => {
    expect(weekKey('2026-08-09')).toBe('2026-08-03'); // Sunday → that week's Monday
  });
});
