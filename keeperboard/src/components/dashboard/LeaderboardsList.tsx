'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import LeaderboardForm from '@/components/forms/LeaderboardForm';

interface Leaderboard {
  id: string;
  name: string;
  slug: string;
  sort_order: 'asc' | 'desc';
  score_count: number;
  created_at: string;
}

interface LeaderboardsListProps {
  gameId: string;
  environmentId: string;
  leaderboards: Leaderboard[];
  onLeaderboardCreated: () => void;
}

export default function LeaderboardsList({
  gameId,
  environmentId,
  leaderboards,
  onLeaderboardCreated,
}: LeaderboardsListProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (data: {
    name: string;
    slug: string;
    sort_order: 'asc' | 'desc';
    reset_schedule: 'none' | 'daily' | 'weekly' | 'monthly';
    reset_hour: number;
  }) => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/leaderboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          environment_id: environmentId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create leaderboard');
      }

      setIsCreating(false);
      onLeaderboardCreated();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Create Form (when creating) */}
      {isCreating ? (
        <div className="p-4 bg-neutral-900/30 border-2 border-cyan-500/20 relative">
          <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500" />
          <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500" />

          <h3 className="text-lg font-mono font-bold text-cyan-400 mb-4">
            Create New Leaderboard
          </h3>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50">
              <p className="text-red-400 text-xs font-mono">⚠ {error}</p>
            </div>
          )}

          <LeaderboardForm
            onSubmit={handleCreate}
            submitLabel="Create Leaderboard"
            loading={creating}
          />

          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreating(false);
                setError(null);
              }}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* Create Button */
        <Button
          variant="primary"
          onClick={() => setIsCreating(true)}
          className="w-full"
        >
          + Create Leaderboard
        </Button>
      )}

      {/* Leaderboards List */}
      {leaderboards.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-cyan-500/20">
          <p className="text-sm font-mono text-neutral-500 mb-2">
            No leaderboards in this environment
          </p>
          <p className="text-xs font-mono text-neutral-600">
            Create one to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboards.map((leaderboard) => (
            <div
              key={leaderboard.id}
              onClick={() =>
                router.push(
                  `/dashboard/games/${gameId}/leaderboards/${leaderboard.id}`
                )
              }
              className="
                p-4 bg-neutral-900/30 border-2 border-cyan-500/10
                hover:border-cyan-500/40 hover:bg-neutral-900/50
                transition-all cursor-pointer relative group
              "
            >
              {/* Hover corner brackets */}
              <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-mono font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                    {leaderboard.name}
                  </h3>
                  <p className="text-xs font-mono text-neutral-500 mt-1">
                    /{leaderboard.slug}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-neutral-500 uppercase">
                      {leaderboard.sort_order === 'desc'
                        ? 'Highest First'
                        : 'Lowest First'}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-neutral-400 mt-1">
                    {leaderboard.score_count}{' '}
                    {leaderboard.score_count === 1 ? 'score' : 'scores'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
