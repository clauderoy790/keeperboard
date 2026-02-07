'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LeaderboardForm from '@/components/forms/LeaderboardForm';

interface Leaderboard {
  id: string;
  game_id: string;
  environment_id: string;
  name: string;
  slug: string;
  sort_order: 'asc' | 'desc';
  score_count: number;
  created_at: string;
}

export default function LeaderboardDetailPage({
  params,
}: {
  params: Promise<{ gameId: string; leaderboardId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(
        `/api/games/${resolvedParams.gameId}/leaderboards/${resolvedParams.leaderboardId}`
      );
      const data = await response.json();

      if (!response.ok) {
        router.push(`/dashboard/games/${resolvedParams.gameId}`);
        return;
      }

      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      router.push(`/dashboard/games/${resolvedParams.gameId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (formData: {
    name: string;
    slug: string;
    sort_order: 'asc' | 'desc';
  }) => {
    setUpdating(true);
    try {
      const response = await fetch(
        `/api/games/${resolvedParams.gameId}/leaderboards/${resolvedParams.leaderboardId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update leaderboard');
      }

      setLeaderboard(data.leaderboard);
      setEditing(false);
    } catch (error: any) {
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${leaderboard?.name}"?\n\nThis will permanently delete all scores in this leaderboard. This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/games/${resolvedParams.gameId}/leaderboards/${resolvedParams.leaderboardId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete leaderboard');
      }

      router.push(`/dashboard/games/${resolvedParams.gameId}`);
    } catch (error: any) {
      alert(error.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!leaderboard) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2">
            {leaderboard.name}
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-cyan-500 to-transparent mb-2" />
          <p className="text-sm font-mono text-neutral-500">
            /{leaderboard.slug}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/games/${resolvedParams.gameId}`)}
        >
          ← Back to Game
        </Button>
      </div>

      {/* Leaderboard Info */}
      <Card
        title="Leaderboard Settings"
        footer={
          !editing && (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setEditing(true)}
                className="flex-1"
              >
                Edit Leaderboard
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={deleting}
                className="flex-1"
              >
                Delete Leaderboard
              </Button>
            </div>
          )
        }
      >
        {editing ? (
          <div>
            <LeaderboardForm
              initialData={{
                name: leaderboard.name,
                slug: leaderboard.slug,
                sort_order: leaderboard.sort_order,
              }}
              onSubmit={handleUpdate}
              submitLabel="Save Changes"
              loading={updating}
            />
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => setEditing(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                Name
              </label>
              <p className="text-lg font-mono text-cyan-400 font-semibold">
                {leaderboard.name}
              </p>
            </div>
            <div>
              <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                Slug
              </label>
              <p className="text-lg font-mono text-neutral-300">
                /{leaderboard.slug}
              </p>
            </div>
            <div>
              <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                Sort Order
              </label>
              <p className="text-sm font-mono text-neutral-400 mt-1">
                {leaderboard.sort_order === 'desc'
                  ? 'Highest First (Descending)'
                  : 'Lowest First (Ascending)'}
              </p>
            </div>
            <div>
              <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                Total Scores
              </label>
              <p className="text-sm font-mono text-neutral-400">
                {leaderboard.score_count}
              </p>
            </div>
            <div>
              <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                Created
              </label>
              <p className="text-sm font-mono text-neutral-400">
                {new Date(leaderboard.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Scores Section (Placeholder for Phase 11) */}
      <Card title="Scores" description="View and manage scores">
        <div className="text-center py-8">
          <p className="text-sm font-mono text-neutral-500">
            Scores management coming in Phase 11
          </p>
        </div>
      </Card>
    </div>
  );
}
