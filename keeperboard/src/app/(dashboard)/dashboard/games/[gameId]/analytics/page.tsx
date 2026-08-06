'use client';

/**
 * Game-level analytics, scoped to one environment at a time.
 *
 * Environment scoping is the whole point of this page living at the game level rather than
 * under a leaderboard: a player GUID is one per install and shared across every leaderboard
 * in a game, so per-leaderboard numbers would double-count anyone playing two boards — and
 * dev testing would silently inflate production.
 *
 * Tab, environment and range live in the URL so a view can be linked, bookmarked and
 * survives a refresh.
 */

import { Suspense, use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  AcquisitionPanel,
  AudiencePanel,
  OverviewPanel,
  RetentionPanel,
} from '@/components/dashboard/analytics/tabs';
import {
  ANALYTICS_TABS,
  RANGE_OPTIONS,
  type AcquisitionResponse,
  type AnalyticsTab,
  type AudienceResponse,
  type OverviewResponse,
  type RangeKey,
  type RetentionResponse,
} from '@/types/analytics';

interface Environment {
  id: string;
  name: string;
  is_default: boolean;
}

type PanelData =
  | OverviewResponse
  | RetentionResponse
  | AudienceResponse
  | AcquisitionResponse;

function isTab(value: string | null): value is AnalyticsTab {
  return ANALYTICS_TABS.some((tab) => tab.id === value);
}

function isRange(value: string | null): value is RangeKey {
  return RANGE_OPTIONS.some((option) => option.id === value);
}

/** Earliest date we'd ever have data for; "All" needs a concrete lower bound. */
const EPOCH = '2020-01-01T00:00:00.000Z';

function rangeToQuery(range: RangeKey): { from: string; to: string } {
  const to = new Date();
  const option = RANGE_OPTIONS.find((entry) => entry.id === range)!;

  return {
    from:
      option.days === null
        ? EPOCH
        : new Date(to.getTime() - option.days * 24 * 60 * 60 * 1000).toISOString(),
    to: to.toISOString(),
  };
}

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);

  return (
    <Suspense fallback={<PageFallback />}>
      <AnalyticsContent gameId={gameId} />
    </Suspense>
  );
}

function PageFallback() {
  return (
    <div className="flex justify-center py-16">
      <LoadingSpinner />
    </div>
  );
}

function AnalyticsContent({ gameId }: { gameId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const rangeParam = searchParams.get('range');
  const envParam = searchParams.get('env');

  const tab: AnalyticsTab = isTab(tabParam) ? tabParam : 'overview';
  const range: RangeKey = isRange(rangeParam) ? rangeParam : '30d';

  const [gameName, setGameName] = useState<string>('');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentId, setEnvironmentId] = useState<string | null>(envParam);
  const [error, setError] = useState<string | null>(null);

  /**
   * Responses keyed by tab+environment+range, so switching back is instant.
   *
   * Crucially, the panel reads from this map by the *current* key rather than from a
   * separate "latest response" value. `tab` changes synchronously (it comes from the URL)
   * while data arrives later, so a single shared slot would render one frame of the new
   * tab against the old tab's payload — and since each panel reads different fields, that
   * frame throws rather than merely looking wrong. Looking up by key makes a mismatch
   * simply a miss, which renders the spinner.
   */
  const [cache, setCache] = useState<ReadonlyMap<string, PanelData>>(() => new Map());

  const dataKey = environmentId ? `${tab}|${environmentId}|${range}` : null;
  const data = dataKey ? (cache.get(dataKey) ?? null) : null;
  const loading = !data && !error;

  const updateQuery = useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) params.set(key, value);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Game name and environments — independent, so fetched together rather than in sequence.
  useEffect(() => {
    let cancelled = false;

    async function loadShell() {
      try {
        const [gameResponse, envResponse] = await Promise.all([
          fetch(`/api/games/${gameId}`),
          fetch(`/api/games/${gameId}/environments`),
        ]);

        if (cancelled) return;

        if (gameResponse.ok) {
          const payload = await gameResponse.json();
          setGameName(payload.game?.name ?? '');
        }

        if (envResponse.ok) {
          const payload = await envResponse.json();
          const list: Environment[] = payload.environments ?? [];
          setEnvironments(list);

          setEnvironmentId((current) => {
            if (current && list.some((env) => env.id === current)) return current;
            return (list.find((env) => env.is_default) ?? list[0])?.id ?? null;
          });
        }
      } catch {
        if (!cancelled) setError('Could not load this game. Check your connection and retry.');
      }
    }

    loadShell();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  useEffect(() => {
    // Already cached — nothing to do. Derived during render, so no state to set here.
    if (!environmentId || !dataKey || cache.has(dataKey)) return;

    // Cancels in-flight requests so a slow earlier tab can't overwrite a newer one.
    const controller = new AbortController();
    const { from, to } = rangeToQuery(range);
    const query = new URLSearchParams({ environment_id: environmentId, from, to });

    fetch(`/api/games/${gameId}/analytics/${tab}?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? 'Failed to load analytics');
        }
        return response.json();
      })
      .then((payload: PanelData) => {
        setCache((previous) => new Map(previous).set(dataKey, payload));
        setError(null);
      })
      .catch((cause: Error) => {
        if (cause.name === 'AbortError') return;
        setError(cause.message);
      });

    return () => controller.abort();
  }, [gameId, tab, environmentId, range, dataKey, cache]);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = ANALYTICS_TABS.findIndex((entry) => entry.id === tab);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % ANALYTICS_TABS.length;
    if (event.key === 'ArrowLeft')
      nextIndex = (currentIndex - 1 + ANALYTICS_TABS.length) % ANALYTICS_TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = ANALYTICS_TABS.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = ANALYTICS_TABS[nextIndex]!;
    updateQuery({ tab: nextTab.id });
    document.getElementById(`tab-${nextTab.id}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-wider text-cyan-400">
            {gameName || 'Analytics'}
          </h1>
          <div className="mt-2 h-0.5 w-32 bg-gradient-to-r from-cyan-500 to-transparent" />
          <p className="mt-2 text-xs font-mono text-neutral-500">
            Scoped to one environment. Dev testing never counts toward production.
          </p>
        </div>
        <Link
          href={`/dashboard/games/${gameId}`}
          className="font-mono text-sm text-cyan-400 transition-colors duration-200 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
        >
          ← Back to Game
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <label
            htmlFor="analytics-environment"
            className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400"
          >
            Environment
          </label>
          <select
            id="analytics-environment"
            value={environmentId ?? ''}
            onChange={(event) => {
              setEnvironmentId(event.target.value);
              updateQuery({ env: event.target.value });
            }}
            className="cursor-pointer appearance-none border-2 border-cyan-500/20 bg-neutral-900 px-4 py-2 font-mono text-sm text-neutral-100 transition-colors duration-200 focus:border-cyan-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
          >
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
                {environment.is_default ? ' (Default)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span
            id="analytics-range-label"
            className="text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400"
          >
            Range
          </span>
          <div
            role="group"
            aria-labelledby="analytics-range-label"
            className="flex border-2 border-cyan-500/20"
          >
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={range === option.id}
                onClick={() => updateQuery({ range: option.id })}
                className={`border-r border-cyan-500/10 px-3 py-2 font-mono text-xs tracking-wide transition-colors duration-200 last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  range === option.id
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Analytics sections" className="flex overflow-x-auto border-b-2 border-cyan-500/20">
        {ANALYTICS_TABS.map((entry) => (
          <button
            key={entry.id}
            id={`tab-${entry.id}`}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            aria-controls={`panel-${entry.id}`}
            tabIndex={tab === entry.id ? 0 : -1}
            onClick={() => updateQuery({ tab: entry.id })}
            onKeyDown={handleTabKeyDown}
            className={`-mb-0.5 whitespace-nowrap border-b-2 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-widest transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              tab === entry.id
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
        aria-busy={loading}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <div aria-live="polite" className="sr-only">
          {loading ? 'Loading analytics…' : 'Analytics updated'}
        </div>

        {error ? (
          <Card className="p-6">
            <p className="font-mono text-sm text-red-400">{error}</p>
            <p className="mt-2 font-mono text-xs text-neutral-500">
              Try selecting a different range, or reload the page.
            </p>
          </Card>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : data ? (
          <Panel tab={tab} data={data} />
        ) : null}
      </div>
    </div>
  );
}

function Panel({ tab, data }: { tab: AnalyticsTab; data: PanelData }) {
  switch (tab) {
    case 'overview':
      return <OverviewPanel data={data as OverviewResponse} />;
    case 'retention':
      return <RetentionPanel data={data as RetentionResponse} />;
    case 'audience':
      return <AudiencePanel data={data as AudienceResponse} />;
    case 'acquisition':
      return <AcquisitionPanel data={data as AcquisitionResponse} />;
  }
}
