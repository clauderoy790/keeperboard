'use client';

/**
 * Inline SVG charts for the analytics dashboard.
 *
 * Hand-rolled rather than pulling a charting library: the shapes needed here are simple,
 * and a library would add bundle weight plus a second styling system to reconcile with the
 * existing terminal aesthetic.
 *
 * Conventions:
 * - Every chart carries role="img" and an aria-label describing what it shows, since the
 *   marks themselves convey nothing to a screen reader.
 * - Path maths is memoized; it runs over every data point and would otherwise repeat on
 *   each parent re-render.
 * - Charts are static. Nothing animates, so there is no reduced-motion variant to provide.
 * - A minimum width plus the caller's scroll container keeps narrow screens readable
 *   instead of squashing the marks.
 */

import { useMemo } from 'react';
import { formatDay, formatNumber, platformColor } from './primitives';
import type { Cohort, DayPoint } from '@/types/analytics';

const AXIS = '#525252';
const GRID = 'rgba(6,182,212,.09)';

// =============================================
// Players & plays over time
// =============================================

export function TrafficChart({ series }: { series: DayPoint[] }) {
  const geometry = useMemo(() => {
    if (series.length === 0) return null;

    const width = 1000;
    const height = 260;
    const padding = { left: 46, right: 46, top: 24, bottom: 32 };
    const inner = {
      w: width - padding.left - padding.right,
      h: height - padding.top - padding.bottom,
    };

    const maxPlays = Math.max(...series.map((d) => d.plays), 1) * 1.1;
    const maxPlayers = Math.max(...series.map((d) => d.players), 1) * 1.25;

    const x = (index: number) =>
      padding.left + (series.length === 1 ? inner.w / 2 : (index / (series.length - 1)) * inner.w);
    const yPlays = (value: number) => padding.top + inner.h - (value / maxPlays) * inner.h;
    const yPlayers = (value: number) => padding.top + inner.h - (value / maxPlayers) * inner.h;

    const points = series.map((d, i) => [x(i), yPlayers(d.players)] as const);
    const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
    const area = `M${points[0]![0].toFixed(1)} ${padding.top + inner.h} ${points
      .map(([px, py]) => `L${px.toFixed(1)} ${py.toFixed(1)}`)
      .join(' ')} L${points.at(-1)![0].toFixed(1)} ${padding.top + inner.h} Z`;

    const barWidth = Math.max(1, (inner.w / series.length) * 0.55);

    return { width, height, padding, inner, maxPlays, maxPlayers, x, yPlays, line, area, barWidth, points };
  }, [series]);

  if (!geometry) return null;

  const { width, height, padding, inner, maxPlays, maxPlayers, x, yPlays, line, area, barWidth, points } =
    geometry;

  const totalPlays = series.reduce((sum, d) => sum + d.plays, 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full min-w-[640px]"
      height={height}
      role="img"
      aria-label={`Daily active players and plays from ${formatDay(series[0]!.date)} to ${formatDay(series.at(-1)!.date)}. ${formatNumber(totalPlays)} plays total.`}
    >
      <defs>
        <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/*
        Two series on two scales. Plays are typically an order of magnitude larger than
        players, so a shared axis would flatten the player line onto the baseline — but an
        unlabelled second scale is worse, because the line then reads against the plays
        axis and overstates player counts several-fold. Both axes are labelled and
        colour-matched to their series.
      */}
      {[0, 0.5, 1].map((fraction) => {
        const y = padding.top + inner.h - fraction * inner.h;
        return (
          <g key={fraction}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={GRID} />
            <text
              x={padding.left - 8}
              y={y + 4}
              fill="rgba(167,139,250,.75)"
              fontSize="10"
              textAnchor="end"
            >
              {Math.round(fraction * maxPlays)}
            </text>
            <text
              x={width - padding.right + 8}
              y={y + 4}
              fill="#22d3ee"
              fontSize="10"
              textAnchor="start"
            >
              {Math.round(fraction * maxPlayers)}
            </text>
          </g>
        );
      })}
      <text
        x={padding.left - 8}
        y={padding.top - 4}
        fill="rgba(167,139,250,.75)"
        fontSize="9"
        textAnchor="end"
      >
        plays
      </text>
      <text
        x={width - padding.right + 8}
        y={padding.top - 4}
        fill="#22d3ee"
        fontSize="9"
        textAnchor="start"
      >
        players
      </text>

      {series.map((point, index) => {
        const barHeight = padding.top + inner.h - yPlays(point.plays);
        return (
          <rect
            key={point.date}
            x={x(index) - barWidth / 2}
            y={yPlays(point.plays)}
            width={barWidth}
            height={Math.max(0, barHeight)}
            fill="rgba(167,139,250,.3)"
          />
        );
      })}

      <path d={area} fill="url(#traffic-fill)" />
      <path d={line} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={points.at(-1)![0]} cy={points.at(-1)![1]} r="3.5" fill="#22d3ee" />

      {series.map((point, index) =>
        index % Math.ceil(series.length / 6) === 0 || index === series.length - 1 ? (
          <text
            key={point.date}
            x={x(index)}
            y={height - 10}
            fill={AXIS}
            fontSize="10"
            textAnchor="middle"
          >
            {formatDay(point.date)}
          </text>
        ) : null
      )}
    </svg>
  );
}

// =============================================
// New vs returning
// =============================================

export function NewReturningChart({ series }: { series: DayPoint[] }) {
  const geometry = useMemo(() => {
    if (series.length === 0) return null;

    const width = 1000;
    const height = 170;
    const padding = { left: 46, right: 16, top: 12, bottom: 26 };
    const inner = {
      w: width - padding.left - padding.right,
      h: height - padding.top - padding.bottom,
    };
    const max = Math.max(...series.map((d) => d.players), 1) * 1.1;
    const barWidth = Math.max(1, (inner.w / series.length) * 0.6);

    return { width, height, padding, inner, max, barWidth };
  }, [series]);

  if (!geometry) return null;

  const { width, height, padding, inner, max, barWidth } = geometry;
  const totalNew = series.reduce((sum, d) => sum + d.newPlayers, 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full min-w-[640px]"
      height={height}
      role="img"
      aria-label={`New versus returning players per day. ${formatNumber(totalNew)} new players in this range.`}
    >
      {series.map((point, index) => {
        const x =
          padding.left +
          (series.length === 1 ? inner.w / 2 : (index / (series.length - 1)) * inner.w) -
          barWidth / 2;
        const totalHeight = (point.players / max) * inner.h;
        const newHeight = (point.newPlayers / max) * inner.h;

        return (
          <g key={point.date}>
            <rect
              x={x}
              y={padding.top + inner.h - totalHeight}
              width={barWidth}
              height={totalHeight}
              fill="#334155"
            />
            <rect
              x={x}
              y={padding.top + inner.h - newHeight}
              width={barWidth}
              height={newHeight}
              fill="#22d3ee"
            />
          </g>
        );
      })}
      <line
        x1={padding.left}
        y1={padding.top + inner.h}
        x2={width - padding.right}
        y2={padding.top + inner.h}
        stroke="rgba(6,182,212,.2)"
      />
    </svg>
  );
}

// =============================================
// Score distribution
// =============================================

export function Histogram({
  buckets,
}: {
  buckets: { label: string; count: number }[];
}) {
  if (buckets.length === 0) return null;

  const width = 520;
  const height = 200;
  const padding = { left: 34, right: 10, top: 12, bottom: 38 };
  const inner = {
    w: width - padding.left - padding.right,
    h: height - padding.top - padding.bottom,
  };
  const max = Math.max(...buckets.map((b) => b.count), 1) * 1.15;
  const slot = inner.w / buckets.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full min-w-[380px]"
      height={height}
      role="img"
      aria-label="Distribution of scores across all runs in this range"
    >
      {buckets.map((bucket, index) => {
        const barHeight = (bucket.count / max) * inner.h;
        const x = padding.left + index * slot;
        return (
          <g key={bucket.label}>
            <rect
              x={x + slot * 0.14}
              y={padding.top + inner.h - barHeight}
              width={slot * 0.72}
              height={Math.max(0, barHeight)}
              fill="rgba(34,211,238,.55)"
            />
            <text
              x={x + slot / 2}
              y={padding.top + inner.h - barHeight - 4}
              fill="#737373"
              fontSize="9"
              textAnchor="middle"
            >
              {bucket.count}
            </text>
            <text
              x={x + slot / 2}
              y={height - 20}
              fill={AXIS}
              fontSize="9"
              textAnchor="middle"
            >
              {bucket.label}
            </text>
          </g>
        );
      })}
      <line
        x1={padding.left}
        y1={padding.top + inner.h}
        x2={width - padding.right}
        y2={padding.top + inner.h}
        stroke="rgba(6,182,212,.2)"
      />
    </svg>
  );
}

// =============================================
// Retention curves
// =============================================

export function RetentionCurves({
  platforms,
}: {
  platforms: { platform: string; players: number; curve: { day: number; value: number | null }[] }[];
}) {
  const width = 1000;
  const height = 250;
  const padding = { left: 46, right: 56, top: 16, bottom: 32 };
  const inner = {
    w: width - padding.left - padding.right,
    h: height - padding.top - padding.bottom,
  };

  const days = platforms[0]?.curve.map((point) => point.day) ?? [];
  if (days.length === 0) return null;

  const x = (index: number) => padding.left + (index / (days.length - 1)) * inner.w;
  const y = (value: number) => padding.top + inner.h - (value / 100) * inner.h;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full min-w-[560px]"
      height={height}
      role="img"
      aria-label="Retention curves by platform, showing the percentage of players still active at each day after their first run"
    >
      {[0, 25, 50, 75, 100].map((value) => (
        <g key={value}>
          <line x1={padding.left} y1={y(value)} x2={width - padding.right} y2={y(value)} stroke={GRID} />
          <text x={padding.left - 8} y={y(value) + 4} fill={AXIS} fontSize="10" textAnchor="end">
            {value}%
          </text>
        </g>
      ))}

      {days.map((day, index) => (
        <text key={day} x={x(index)} y={height - 10} fill="#737373" fontSize="11" textAnchor="middle">
          D{day}
        </text>
      ))}

      {platforms.map((platform) => {
        const color = platformColor(platform.platform);
        const measured = platform.curve
          .map((point, index) => ({ ...point, index }))
          .filter((point): point is { day: number; value: number; index: number } => point.value !== null);

        if (measured.length === 0) return null;

        const path = measured
          .map((point, i) => `${i ? 'L' : 'M'}${x(point.index).toFixed(1)} ${y(point.value).toFixed(1)}`)
          .join(' ');
        const last = measured.at(-1)!;

        return (
          <g key={platform.platform}>
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            {measured.map((point) => (
              <circle key={point.day} cx={x(point.index)} cy={y(point.value)} r="3" fill={color} />
            ))}
            <text x={x(last.index) + 8} y={y(last.value) + 4} fill={color} fontSize="10">
              {platform.platform}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// =============================================
// Activity heatmap
// =============================================

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ActivityHeatmap({
  cells,
  peak,
}: {
  cells: { weekday: number; hour: number; plays: number }[];
  peak: number;
}) {
  const lookup = useMemo(() => {
    // Map beats scanning 168 cells for each of 168 lookups
    const map = new Map<number, number>();
    for (const cell of cells) map.set(cell.weekday * 24 + cell.hour, cell.plays);
    return map;
  }, [cells]);

  if (peak === 0) return null;

  const width = 1000;
  const left = 42;
  const cellWidth = (width - left - 12) / 24;
  const cellHeight = 20;
  const gap = 3;
  const height = 22 + 7 * (cellHeight + gap);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full min-w-[620px]"
      height={height}
      role="img"
      aria-label={`Plays by weekday and hour in UTC. Busiest hour has ${formatNumber(peak)} plays.`}
    >
      {[0, 4, 8, 12, 16, 20].map((hour) => (
        <text
          key={hour}
          x={left + hour * cellWidth + cellWidth / 2}
          y={12}
          fill={AXIS}
          fontSize="9"
          textAnchor="middle"
        >
          {hour.toString().padStart(2, '0')}
        </text>
      ))}

      {WEEKDAYS.map((label, weekday) => (
        <g key={label}>
          <text
            x={left - 8}
            y={22 + weekday * (cellHeight + gap) + 14}
            fill="#737373"
            fontSize="10"
            textAnchor="end"
          >
            {label}
          </text>
          {Array.from({ length: 24 }, (_, hour) => {
            const plays = lookup.get(weekday * 24 + hour) ?? 0;
            return (
              <rect
                key={hour}
                x={left + hour * cellWidth + 1}
                y={22 + weekday * (cellHeight + gap)}
                width={cellWidth - 2}
                height={cellHeight}
                fill={`rgba(34,211,238,${(0.04 + (plays / peak) * 0.76).toFixed(3)})`}
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
}

// =============================================
// Cohort grid
// =============================================

/**
 * Cell background scales with the value so the grid reads as a heat map.
 *
 * Text colour has to flip with it: the background is a cyan alpha over near-black, so a
 * low value leaves an almost-black cell. Dark text everywhere would make exactly the
 * low-retention cells — the ones worth noticing — invisible.
 */
function cohortCell(value: number | null) {
  if (value === null) {
    return { style: undefined, text: '—', className: 'text-neutral-600' };
  }

  const intensity = Math.min(1, value / 32);
  const alpha = 0.1 + intensity * 0.75;

  return {
    style: { backgroundColor: `rgba(34,211,238,${alpha.toFixed(2)})` },
    text: `${value}%`,
    className: `font-semibold ${alpha >= 0.5 ? 'text-cyan-950' : 'text-neutral-100'}`,
  };
}

export function CohortTable({ cohorts }: { cohorts: Cohort[] }) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-cyan-500/20">
          <th scope="col" className="py-3 px-4 text-left text-[11px] font-mono font-semibold uppercase tracking-widest text-cyan-400">
            Cohort
          </th>
          <th scope="col" className="py-3 px-4 text-right text-[11px] font-mono font-semibold uppercase tracking-widest text-cyan-400">
            Players
          </th>
          {['D1', 'D7', 'D30'].map((label) => (
            <th
              key={label}
              scope="col"
              className="py-3 px-4 text-center text-[11px] font-mono font-semibold uppercase tracking-widest text-cyan-400"
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cohorts.map((cohort) => {
          const cells = [cohort.d1, cohort.d7, cohort.d30].map(cohortCell);
          return (
            <tr key={cohort.cohortStart} className="border-b border-cyan-500/10">
              <td className="py-3 px-4 text-xs font-mono text-neutral-400 whitespace-nowrap">
                Week of {formatDay(cohort.cohortStart)}
              </td>
              <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-neutral-100 tabular-nums">
                {formatNumber(cohort.players)}
              </td>
              {cells.map((cell, index) => (
                <td
                  key={index}
                  style={cell.style}
                  className={`py-3 px-4 text-center text-sm font-mono tabular-nums ${cell.className}`}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
