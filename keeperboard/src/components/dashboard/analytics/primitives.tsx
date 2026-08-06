'use client';

/**
 * Shared display primitives for the analytics dashboard.
 *
 * Formatting rules that apply throughout:
 * - `null` renders as an em dash, never 0. A cohort too young to have a D7 has not
 *   churned — it is unmeasurable, and showing 0% would read as catastrophic churn.
 * - Numbers go through Intl so grouping matches the viewer's locale.
 * - Figures use tabular-nums so columns align.
 */

import { ReactNode } from 'react';

const numberFormat = new Intl.NumberFormat();

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Percentages arrive pre-rounded to one decimal from the API. */
export function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest.toString().padStart(2, '0')}s`;
}

export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Per-platform accent colors, reused across every chart so a platform reads consistently. */
export const PLATFORM_COLORS: Record<string, string> = {
  web: '#22d3ee',
  ios: '#a78bfa',
  android: '#4ade80',
  windows: '#60a5fa',
  macos: '#f472b6',
  linux: '#fbbf24',
  unknown: '#525252',
};

export function platformColor(platform: string): string {
  return PLATFORM_COLORS[platform] ?? '#737373';
}

/**
 * Severity color for a retention figure. Semantic, deliberately distinct from the cyan
 * accent so "needs attention" reads at a glance rather than blending into the theme.
 */
export function retentionColor(value: number | null): string {
  if (value === null) return 'text-neutral-500';
  if (value >= 15) return 'text-green-400';
  if (value >= 8) return 'text-amber-400';
  return 'text-red-400';
}

// =============================================
// Layout
// =============================================

export function SectionHeading({
  title,
  note,
  description,
}: {
  title: string;
  note?: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-mono font-semibold text-cyan-400 uppercase tracking-widest">
          {title}
        </h2>
        {note ? <span className="text-xs font-mono text-neutral-500">{note}</span> : null}
      </div>
      {description ? (
        <p className="mt-1 text-xs font-mono text-neutral-500">{description}</p>
      ) : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-neutral-950/60 px-4 py-4 flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      <span className="text-2xl font-mono font-bold text-neutral-100 tabular-nums leading-tight">
        {value}
      </span>
      {hint ? (
        <span className="text-[11px] font-mono text-neutral-500 tabular-nums">{hint}</span>
      ) : null}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-px bg-cyan-500/10 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
      {children}
    </div>
  );
}

/** Wide content scrolls inside its own container so the page never scrolls sideways. */
export function ScrollArea({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm font-mono text-neutral-500">{message}</p>
  );
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 border-l-2 border-cyan-500 bg-cyan-500/5 px-4 py-3 text-xs font-mono leading-relaxed text-neutral-400">
      {children}
    </p>
  );
}

/** Small labelled chip. `color` is a CSS color so it can carry a platform accent. */
export function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span
      className="inline-block border px-2 py-0.5 text-[11px] font-mono tracking-wide"
      style={color ? { color, borderColor: color } : undefined}
    >
      {label}
    </span>
  );
}

// =============================================
// Bar list
// =============================================

export interface BarRow {
  label: string;
  value: number;
  secondary?: string;
  color?: string;
}

/**
 * Horizontal bars scaled to the largest value, for ranked breakdowns.
 * Bars are presentational; the accessible content is the adjacent text.
 */
export function BarList({ rows }: { rows: BarRow[] }) {
  if (rows.length === 0) return <EmptyState message="No data in this range." />;

  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3">
          <span className="truncate text-xs font-mono text-neutral-300" title={row.label}>
            {row.label}
          </span>
          <span className="h-4 bg-white/5 overflow-hidden" aria-hidden="true">
            <span
              className="block h-full"
              style={{
                width: `${(row.value / max) * 100}%`,
                backgroundColor: row.color ?? '#22d3ee',
              }}
            />
          </span>
          <span className="text-right text-xs font-mono text-neutral-400 tabular-nums">
            <strong className="font-semibold text-neutral-100">
              {formatNumber(row.value)}
            </strong>
            {row.secondary ? ` · ${row.secondary}` : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
