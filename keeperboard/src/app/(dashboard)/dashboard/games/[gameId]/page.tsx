'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import GameForm from '@/components/forms/GameForm';
import ApiKeysCard from '@/components/dashboard/ApiKeysCard';
import EnvironmentsCard from '@/components/dashboard/EnvironmentsCard';
import EnvironmentSwitcher from '@/components/dashboard/EnvironmentSwitcher';
import LeaderboardsList from '@/components/dashboard/LeaderboardsList';

interface Game {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  user_id: string;
}

interface ApiKey {
  id: string;
  environment_id: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string | null;
}

interface Environment {
  id: string;
  game_id: string;
  name: string;
  slug: string;
  is_default: boolean;
  created_at: string;
}

interface Leaderboard {
  id: string;
  name: string;
  slug: string;
  sort_order: 'asc' | 'desc';
  score_count: number;
  created_at: string;
}

export default function GameDetailPage({ params }: { params: Promise<{ gameId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [leaderboards, setLeaderboards] = useState<Leaderboard[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchGame();
    fetchEnvironments();
    fetchApiKeys();
  }, []);

  useEffect(() => {
    if (selectedEnvironmentId) {
      fetchLeaderboards();
    }
  }, [selectedEnvironmentId]);

  const fetchGame = async () => {
    try {
      const response = await fetch(`/api/games/${resolvedParams.gameId}`);
      const data = await response.json();

      if (!response.ok) {
        router.push('/dashboard/games');
        return;
      }

      setGame(data.game);
    } catch (error) {
      console.error('Failed to fetch game:', error);
      router.push('/dashboard/games');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvironments = async () => {
    try {
      const response = await fetch(`/api/games/${resolvedParams.gameId}/environments`);
      const data = await response.json();

      if (response.ok) {
        setEnvironments(data.environments || []);
        // Auto-select default environment
        const defaultEnv = data.environments?.find((e: Environment) => e.is_default);
        if (defaultEnv && !selectedEnvironmentId) {
          setSelectedEnvironmentId(defaultEnv.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch environments:', error);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`/api/games/${resolvedParams.gameId}/api-keys`);
      const data = await response.json();

      if (response.ok) {
        setApiKeys(data.api_keys || []);
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const fetchLeaderboards = async () => {
    if (!selectedEnvironmentId) return;

    try {
      const response = await fetch(
        `/api/games/${resolvedParams.gameId}/leaderboards?environment_id=${selectedEnvironmentId}`
      );
      const data = await response.json();

      if (response.ok) {
        setLeaderboards(data.leaderboards || []);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboards:', error);
    }
  };

  const handleUpdateGame = async (formData: { name: string; slug: string; description: string }) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/games/${resolvedParams.gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update game');
      }

      setGame(data.game);
      setEditing(false);
    } catch (error: any) {
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!confirm('Are you sure you want to delete this game? This action cannot be undone and will delete all associated leaderboards and scores.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/games/${resolvedParams.gameId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete game');
      }

      router.push('/dashboard/games');
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

  if (!game) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2">
            {game.name}
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-cyan-500 to-transparent mb-2" />
          <p className="text-sm font-mono text-neutral-500">/{game.slug}</p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/dashboard/games')}>
          ← Back to Games
        </Button>
      </div>

      {/* Game Info */}
      <Card
        title="Game Information"
        footer={
          !editing && (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setEditing(true)} className="flex-1">
                Edit Game
              </Button>
              <Button variant="danger" onClick={handleDeleteGame} loading={deleting} className="flex-1">
                Delete Game
              </Button>
            </div>
          )
        }
      >
        {editing ? (
          <div>
            <GameForm
              initialData={{
                name: game.name,
                slug: game.slug,
                description: game.description || '',
              }}
              onSubmit={handleUpdateGame}
              submitLabel="Save Changes"
              loading={updating}
            />
            <div className="mt-4">
              <Button variant="ghost" onClick={() => setEditing(false)} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Name</label>
              <p className="text-lg font-mono text-cyan-400 font-semibold">{game.name}</p>
            </div>
            <div>
              <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Slug</label>
              <p className="text-lg font-mono text-neutral-300">/{game.slug}</p>
            </div>
            {game.description && (
              <div>
                <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Description</label>
                <p className="text-sm font-mono text-neutral-400 mt-1">{game.description}</p>
              </div>
            )}
            <div>
              <label className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Created</label>
              <p className="text-sm font-mono text-neutral-400">{new Date(game.created_at).toLocaleString()}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Environments */}
      <EnvironmentsCard
        gameId={resolvedParams.gameId}
        environments={environments}
        onEnvironmentCreated={fetchEnvironments}
        onEnvironmentDeleted={() => {
          fetchEnvironments();
          setSelectedEnvironmentId(null);
        }}
      />

      {/* API Keys */}
      <ApiKeysCard
        gameId={resolvedParams.gameId}
        apiKeys={apiKeys}
        environments={environments}
        onKeyGenerated={fetchApiKeys}
      />

      {/* Leaderboards Section */}
      <Card
        title="Leaderboards"
        description="Manage leaderboards for this game"
      >
        <div className="space-y-4">
          {/* Environment Switcher */}
          {environments.length > 0 && (
            <EnvironmentSwitcher
              environments={environments}
              selectedEnvironmentId={selectedEnvironmentId}
              onEnvironmentChange={setSelectedEnvironmentId}
            />
          )}

          {/* Leaderboards List */}
          {selectedEnvironmentId ? (
            <LeaderboardsList
              gameId={resolvedParams.gameId}
              environmentId={selectedEnvironmentId}
              leaderboards={leaderboards}
              onLeaderboardCreated={fetchLeaderboards}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-sm font-mono text-neutral-500">
                Create an environment first to add leaderboards
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
