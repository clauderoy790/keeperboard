'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface LeaderboardFormProps {
  initialData?: {
    name: string;
    sort_order: 'asc' | 'desc';
    reset_schedule?: 'none' | 'daily' | 'weekly' | 'monthly';
    reset_hour?: number;
  };
  onSubmit: (data: {
    name: string;
    sort_order: 'asc' | 'desc';
    reset_schedule: 'none' | 'daily' | 'weekly' | 'monthly';
    reset_hour: number;
  }) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
  isEditing?: boolean;
}

export default function LeaderboardForm({
  initialData,
  onSubmit,
  submitLabel = 'Create Leaderboard',
  loading = false,
  isEditing = false,
}: LeaderboardFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    initialData?.sort_order || 'desc'
  );
  const [resetSchedule, setResetSchedule] = useState<'none' | 'daily' | 'weekly' | 'monthly'>(
    initialData?.reset_schedule || 'none'
  );
  const [resetHour, setResetHour] = useState<number>(
    initialData?.reset_hour ?? 0
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name) {
      setError('Name is required');
      return;
    }

    try {
      await onSubmit({
        name,
        sort_order: sortOrder,
        reset_schedule: resetSchedule,
        reset_hour: resetHour,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save leaderboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-500/10 border-2 border-red-500/50 relative">
          <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-red-500" />
          <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-red-500" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-red-500" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-red-500" />
          <p className="text-red-400 text-sm font-mono">⚠ {error}</p>
        </div>
      )}

      <Input
        label="Leaderboard Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="High Scores"
        required
        helperText="The name used to identify this leaderboard in the API"
      />

      <div>
        <label className="block text-xs font-mono font-semibold text-cyan-400 mb-2 tracking-widest uppercase">
          Sort Order
        </label>
        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="
              w-full px-4 py-2.5 bg-neutral-900/50 border-2 border-cyan-500/20
              focus:border-cyan-500/60 text-neutral-100 font-mono text-sm
              focus:outline-none focus:ring-2 focus:ring-cyan-500/20
              transition-all duration-200 appearance-none cursor-pointer
            "
          >
            <option value="desc">Highest First (Descending)</option>
            <option value="asc">Lowest First (Ascending)</option>
          </select>
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500/40 pointer-events-none" />
          {/* Dropdown arrow */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-neutral-500 font-mono mt-1">
          Choose whether higher scores or lower scores rank first
        </p>
      </div>

      <div>
        <label className="block text-xs font-mono font-semibold text-cyan-400 mb-2 tracking-widest uppercase">
          Reset Schedule
        </label>
        <div className="relative">
          <select
            value={resetSchedule}
            onChange={(e) => setResetSchedule(e.target.value as 'none' | 'daily' | 'weekly' | 'monthly')}
            disabled={isEditing}
            className="
              w-full px-4 py-2.5 bg-neutral-900/50 border-2 border-cyan-500/20
              focus:border-cyan-500/60 text-neutral-100 font-mono text-sm
              focus:outline-none focus:ring-2 focus:ring-cyan-500/20
              transition-all duration-200 appearance-none cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <option value="none">No Reset (All-Time)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500/40 pointer-events-none" />
          {/* Dropdown arrow */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-neutral-500 font-mono mt-1">
          {isEditing
            ? 'Reset schedule cannot be changed after creation'
            : "How often this leaderboard resets. 'No Reset' keeps all scores permanently."}
        </p>
      </div>

      {resetSchedule !== 'none' && (
        <div>
          <label className="block text-xs font-mono font-semibold text-cyan-400 mb-2 tracking-widest uppercase">
            Reset Time (UTC)
          </label>
          <div className="relative">
            <select
              value={resetHour}
              onChange={(e) => setResetHour(Number(e.target.value))}
              className="
                w-full px-4 py-2.5 bg-neutral-900/50 border-2 border-cyan-500/20
                focus:border-cyan-500/60 text-neutral-100 font-mono text-sm
                focus:outline-none focus:ring-2 focus:ring-cyan-500/20
                transition-all duration-200 appearance-none cursor-pointer
              "
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}:00 UTC
                </option>
              ))}
            </select>
            {/* Corner brackets */}
            <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500/40 pointer-events-none" />
            <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500/40 pointer-events-none" />
            <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500/40 pointer-events-none" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500/40 pointer-events-none" />
            {/* Dropdown arrow */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-neutral-500 font-mono mt-1">
            The hour (in UTC) when the leaderboard resets
          </p>
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
