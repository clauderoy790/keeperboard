'use client';

/**
 * Tab panel contents for the analytics dashboard.
 *
 * Each panel receives already-fetched data — loading, error and empty states are handled
 * once by the page rather than repeated four times here.
 */

import Card from '@/components/ui/Card';
import {
  BarList,
  Callout,
  Chip,
  EmptyState,
  ScrollArea,
  SectionHeading,
  StatGrid,
  StatTile,
  formatDuration,
  formatNumber,
  formatPercent,
  platformColor,
  retentionColor,
} from './primitives';
import {
  ActivityHeatmap,
  CohortTable,
  Histogram,
  NewReturningChart,
  RetentionCurves,
  TrafficChart,
} from './charts';
import type {
  AcquisitionResponse,
  AudienceResponse,
  OverviewResponse,
  RetentionResponse,
} from '@/types/analytics';

const tableHeadClass =
  'py-3 px-4 text-[11px] font-mono font-semibold uppercase tracking-widest text-cyan-400';
const cellClass = 'py-3 px-4 text-sm font-mono text-neutral-300 tabular-nums';

export function OverviewPanel({ data }: { data: OverviewResponse }) {
  const { active, totals, engagement, platforms, series, scoreHistogram } = data;
  const hasActivity = totals.windowRuns > 0;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-0">
        <StatGrid>
          <StatTile
            label="Daily Active"
            value={formatNumber(active.dau)}
            hint="last full day (UTC)"
          />
          <StatTile label="Weekly Active" value={formatNumber(active.wau)} hint="last 7d" />
          <StatTile label="Monthly Active" value={formatNumber(active.mau)} hint="last 30d" />
          <StatTile
            label="Stickiness"
            value={`${active.stickiness}%`}
            hint="DAU ÷ MAU"
          />
          <StatTile
            label="Lifetime Players"
            value={formatNumber(totals.lifetimePlayers)}
            hint={`${formatNumber(totals.lifetimeRuns)} runs`}
          />
        </StatGrid>
      </Card>

      <Card className="p-6">
        <SectionHeading
          title="Players & Plays"
          note={`${formatNumber(totals.windowRuns)} runs in range`}
          description="Daily active players (line) against total runs (bars)."
        />
        {hasActivity ? (
          <>
            <ScrollArea>
              <TrafficChart series={series} />
            </ScrollArea>
            <Legend
              items={[
                { label: 'Daily active players', color: '#22d3ee' },
                { label: 'Plays', color: 'rgba(167,139,250,.55)' },
              ]}
            />
          </>
        ) : (
          <EmptyState message="No runs recorded in this range." />
        )}
      </Card>

      <Card className="p-6">
        <SectionHeading
          title="New vs Returning"
          description="Separates acquisition from engagement. A spike that is all-new and never returns is a bounce."
        />
        {hasActivity ? (
          <>
            <ScrollArea>
              <NewReturningChart series={series} />
            </ScrollArea>
            <Legend
              items={[
                { label: 'New players', color: '#22d3ee' },
                { label: 'Returning players', color: '#334155' },
              ]}
            />
          </>
        ) : (
          <EmptyState message="No runs recorded in this range." />
        )}
      </Card>

      <Card className="p-6">
        <SectionHeading
          title="Platform"
          note={`${formatNumber(totals.windowPlayers)} players in range`}
          description="Where people play. Runs from before SDK 2.3.0 report as unknown."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <BarList
            rows={platforms.map((platform) => ({
              label: platform.platform,
              value: platform.players,
              secondary: `${platform.share}%`,
              color: platformColor(platform.platform),
            }))}
          />
          <ScrollArea>
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th scope="col" className={`${tableHeadClass} text-left`}>Platform</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>Players</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>Plays</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((platform) => (
                  <tr key={platform.platform} className="border-b border-cyan-500/10">
                    <td className="py-3 px-4">
                      <Chip label={platform.platform} color={platformColor(platform.platform)} />
                    </td>
                    <td className={`${cellClass} text-right text-neutral-100 font-semibold`}>
                      {formatNumber(platform.players)}
                    </td>
                    <td className={`${cellClass} text-right text-neutral-500`}>
                      {formatNumber(platform.plays)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeading
          title="Engagement"
          description="Whether the game itself is working, not just how many people arrive."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <StatGrid>
            <StatTile label="Median Run" value={formatDuration(engagement.medianRunSeconds)} />
            <StatTile
              label="Abandon Rate"
              value={`${engagement.abandonRate}%`}
              hint="started, never finished"
            />
            <StatTile
              label="Runs Per Sitting"
              value={String(engagement.runsPerActiveDay)}
              hint="on days they play"
            />
            <StatTile label="Longest Run" value={formatDuration(engagement.longestRunSeconds)} />
          </StatGrid>
          <div>
            <ScrollArea>
              <Histogram buckets={scoreHistogram.buckets} />
            </ScrollArea>
            <p className="mt-2 text-center text-[11px] font-mono text-neutral-500">
              Score distribution · median {scoreHistogram.median ?? '—'}
            </p>
          </div>
        </div>
        {engagement.abandonRate > 0 ? (
          <Callout>
            <strong className="text-neutral-100">{engagement.abandonRate}%</strong> of runs are
            started and never finished. Abandoned runs are invisible in scores — only{' '}
            <code>game_runs</code> records them.
          </Callout>
        ) : null}
      </Card>
    </div>
  );
}

export function RetentionPanel({ data }: { data: RetentionResponse }) {
  const { overall, cohorts, byPlatform } = data;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-0">
        <StatGrid>
          <StatTile label="D1 Retention" value={formatPercent(overall.d1)} hint="all platforms" />
          <StatTile label="D7 Retention" value={formatPercent(overall.d7)} hint="all platforms" />
          <StatTile label="D30 Retention" value={formatPercent(overall.d30)} hint="all platforms" />
          <StatTile
            label="Cohorts Tracked"
            value={formatNumber(cohorts.length)}
            hint="weekly"
          />
        </StatGrid>
      </Card>

      <Card className="p-6">
        <SectionHeading
          title="Weekly Cohorts"
          description="Of the players first seen in a given week, how many were still playing on day 1, 7 and 30 or later. Rolling retention, so the figures fall as the window widens. An em dash means the window has not elapsed yet."
        />
        {cohorts.length > 0 ? (
          <ScrollArea>
            <CohortTable cohorts={cohorts} />
          </ScrollArea>
        ) : (
          <EmptyState message="No cohorts yet — this needs at least one player." />
        )}
      </Card>

      <Card className="p-6">
        <SectionHeading
          title="Retention by Platform"
          description="Share of players still active on each day or later, split by build."
        />
        {byPlatform.length > 0 ? (
          <ScrollArea>
            <RetentionCurves platforms={byPlatform} />
          </ScrollArea>
        ) : (
          <EmptyState message="No platform data yet." />
        )}
        <Callout>
          Retention is the number that tells you whether traffic is worth acquiring. Volume
          without return visits is a bounce, not an audience.
        </Callout>
      </Card>
    </div>
  );
}

export function AudiencePanel({ data }: { data: AudienceResponse }) {
  const { heatmap, countries, versions } = data;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <SectionHeading
          title="When People Play"
          note={`${heatmap.timezone} · peak ${formatNumber(heatmap.peak)} plays`}
          description="Darker is busier. Useful for timing a post so it lands when your audience is awake."
        />
        {heatmap.peak > 0 ? (
          <ScrollArea>
            <ActivityHeatmap cells={heatmap.cells} peak={heatmap.peak} />
          </ScrollArea>
        ) : (
          <EmptyState message="No runs recorded in this range." />
        )}
        <Callout>
          Hours are {heatmap.timezone}, not player-local — timestamps are stored without
          offsets. Check the country breakdown to judge how concentrated your audience is.
        </Callout>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionHeading
            title="Countries"
            note="selected range"
            description="Derived server-side from the request. No client work."
          />
          <BarList
            rows={countries.slice(0, 10).map((country) => ({
              label: country.country,
              value: country.players,
              secondary: `${country.share}%`,
              color: country.country === 'unknown' ? '#525252' : 'rgba(34,211,238,.62)',
            }))}
          />
        </Card>

        <Card className="p-6">
          <SectionHeading
            title="Game Version"
            note="all time"
            description="Counted over full history, not the selected range — D7 needs a week to have elapsed since each player arrived."
          />
          {versions.length > 0 ? (
            <ScrollArea>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-500/20">
                    <th scope="col" className={`${tableHeadClass} text-left`}>Version</th>
                    <th scope="col" className={`${tableHeadClass} text-right`}>Players</th>
                    <th scope="col" className={`${tableHeadClass} text-right`}>Median Run</th>
                    <th scope="col" className={`${tableHeadClass} text-right`}>D7</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((version) => (
                    <tr key={version.version} className="border-b border-cyan-500/10">
                      <td className={`${cellClass} text-cyan-400 font-bold`}>{version.version}</td>
                      <td className={`${cellClass} text-right text-neutral-100 font-semibold`}>
                        {formatNumber(version.players)}
                      </td>
                      <td className={`${cellClass} text-right text-neutral-500`}>
                        {formatDuration(version.medianRunSeconds)}
                      </td>
                      <td
                        className={`${cellClass} text-right font-semibold ${retentionColor(version.d7)}`}
                      >
                        {formatPercent(version.d7)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          ) : (
            <EmptyState message="No version data yet." />
          )}
        </Card>
      </div>
    </div>
  );
}

export function AcquisitionPanel({ data }: { data: AcquisitionResponse }) {
  const { sources, taggedCoverage } = data;
  const attributable = sources.filter((source) => source.attributable);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-0">
        <StatGrid>
          <StatTile
            label="Tagged Coverage"
            value={`${taggedCoverage.percent}%`}
            hint="of reachable players"
          />
          <StatTile
            label="Tagged Players"
            value={formatNumber(taggedCoverage.taggedPlayers)}
            hint="arrived via ?ref="
          />
          <StatTile
            label="Reachable"
            value={formatNumber(taggedCoverage.attributablePlayers)}
            hint="excludes app installs"
          />
          <StatTile label="Sources" value={formatNumber(attributable.length)} />
        </StatGrid>
      </Card>

      <Card className="p-6">
        <SectionHeading
          title="Sources"
          note="web only · first-touch"
          description="From the ?ref= tag on the link a player first arrived through."
        />
        {sources.length > 0 ? (
          <ScrollArea>
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th scope="col" className={`${tableHeadClass} text-left`}>Source</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>Players</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>D7</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>Still Playing</th>
                  <th scope="col" className={`${tableHeadClass} text-right`}>Median Run</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.source} className="border-b border-cyan-500/10">
                    <td
                      className={`${cellClass} ${source.attributable ? 'text-cyan-400 font-bold' : 'text-neutral-500'}`}
                    >
                      {source.source}
                    </td>
                    <td className={`${cellClass} text-right text-neutral-100 font-semibold`}>
                      {formatNumber(source.players)}
                    </td>
                    <td className={`${cellClass} text-right font-semibold ${retentionColor(source.d7)}`}>
                      {formatPercent(source.d7)}
                    </td>
                    <td className={`${cellClass} text-right text-neutral-400`}>
                      {source.retainedPlayers === null ? '—' : formatNumber(source.retainedPlayers)}
                    </td>
                    <td className={`${cellClass} text-right text-neutral-500`}>
                      {formatDuration(source.medianRunSeconds)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        ) : (
          <EmptyState message="No source data yet." />
        )}
        <Callout>
          Judge sources on <strong className="text-neutral-100">Still Playing</strong>, not
          arrivals. A source sending three times the traffic at a third the retention is a
          wash. App installs cannot carry a tag through the store, so they report as
          app-install rather than being counted as direct.
        </Callout>
      </Card>
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
          <span
            className="h-2.5 w-2.5 shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
