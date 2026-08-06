/**
 * Response shapes for the dashboard analytics endpoints.
 *
 * Mirrors what `src/app/api/games/[gameId]/analytics/*` returns. Nullable numbers are
 * meaningful throughout: `null` means "not measurable yet" (a cohort too young to have a
 * D7, a median with no data), which must render as an em dash rather than a zero.
 */

export interface AnalyticsRange {
  from: string;
  to: string;
}

export interface DayPoint {
  date: string;
  plays: number;
  players: number;
  newPlayers: number;
  returningPlayers: number;
}

export interface PlatformSlice {
  platform: string;
  players: number;
  plays: number;
  share: number;
}

export interface OverviewResponse {
  range: AnalyticsRange;
  truncated: boolean;
  totals: {
    lifetimePlayers: number;
    lifetimeRuns: number;
    windowPlayers: number;
    windowRuns: number;
  };
  active: {
    dau: number;
    wau: number;
    mau: number;
    stickiness: number;
  };
  series: DayPoint[];
  platforms: PlatformSlice[];
  engagement: {
    medianRunSeconds: number | null;
    longestRunSeconds: number | null;
    abandonRate: number;
    /** Runs per player on days they actually played — not averaged across idle days. */
    runsPerActiveDay: number;
  };
  scoreHistogram: {
    buckets: { label: string; count: number }[];
    median: number | null;
  };
}

export interface Cohort {
  cohortStart: string;
  players: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
}

export interface RetentionResponse {
  range: AnalyticsRange;
  truncated: boolean;
  overall: { d1: number | null; d7: number | null; d30: number | null };
  cohorts: Cohort[];
  byPlatform: {
    platform: string;
    players: number;
    curve: { day: number; value: number | null }[];
  }[];
}

export interface AudienceResponse {
  range: AnalyticsRange;
  truncated: boolean;
  heatmap: {
    cells: { weekday: number; hour: number; plays: number }[];
    peak: number;
    timezone: string;
  };
  countries: { country: string; players: number; plays: number; share: number }[];
  versions: {
    version: string;
    players: number;
    plays: number;
    medianRunSeconds: number | null;
    d7: number | null;
  }[];
}

export interface AcquisitionResponse {
  range: AnalyticsRange;
  truncated: boolean;
  sources: {
    source: string;
    players: number;
    plays: number;
    d7: number | null;
    retainedPlayers: number | null;
    medianRunSeconds: number | null;
    attributable: boolean;
  }[];
  taggedCoverage: {
    taggedPlayers: number;
    /**
     * Players who could in principle carry a `?ref=` tag — everything except known app
     * installs. Includes unknown-platform players (pre-SDK 2.3.0), since we cannot tell
     * whether those were web or app.
     */
    attributablePlayers: number;
    percent: number;
  };
}

export type AnalyticsTab = 'overview' | 'retention' | 'audience' | 'acquisition';

export const ANALYTICS_TABS: { id: AnalyticsTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'retention', label: 'Retention' },
  { id: 'audience', label: 'Audience' },
  { id: 'acquisition', label: 'Acquisition' },
];

export type RangeKey = '7d' | '30d' | '90d' | 'all';

export const RANGE_OPTIONS: { id: RangeKey; label: string; days: number | null }[] = [
  { id: '7d', label: '7d', days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
  { id: 'all', label: 'All', days: null },
];
