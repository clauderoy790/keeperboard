'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import GameForm from '@/components/forms/GameForm';
import Link from 'next/link';

interface Game {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  leaderboard_count: number;
}

export default function GamesPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games');
      const data = await response.json();
      setGames(data.games || []);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async (formData: { name: string; slug: string; description: string }) => {
    setCreating(true);
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game');
      }

      // Redirect to game detail page
      router.push(`/dashboard/games/${data.game.id}`);
    } catch (error: any) {
      setCreating(false);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2">
            Games
          </h1>
          <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-transparent" />
        </div>
        {!showCreateForm && games.length > 0 && (
          <Button onClick={() => setShowCreateForm(true)}>
            Create Game
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card title="Create New Game" className="animate-in slide-in-from-top-4">
          <GameForm
            onSubmit={handleCreateGame}
            submitLabel="Create Game"
            loading={creating}
          />
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowCreateForm(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Games List */}
      {games.length === 0 && !showCreateForm ? (
        <Card className="text-center py-12">
          <div className="text-cyan-500/30 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
          </div>
          <h3 className="text-xl font-mono font-bold text-neutral-400 mb-2">
            No Games Yet
          </h3>
          <p className="text-sm font-mono text-neutral-600 mb-6">
            Create your first game to start tracking leaderboards
          </p>
          <Button onClick={() => setShowCreateForm(true)} size="lg">
            Create Your First Game
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, index) => (
            <Link
              key={game.id}
              href={`/dashboard/games/${game.id}`}
              className="block"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card
                className="h-full hover:scale-105 transition-all duration-300 cursor-pointer"
                glowEffect
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-mono font-bold text-cyan-400 mb-1">
                      {game.name}
                    </h3>
                    <p className="text-sm font-mono text-neutral-500">
                      /{game.slug}
                    </p>
                  </div>

                  {game.description && (
                    <p className="text-sm font-mono text-neutral-400 line-clamp-2">
                      {game.description}
                    </p>
                  )}

                  <div className="pt-4 border-t border-cyan-500/20">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-neutral-500">Leaderboards</span>
                      <span className="text-cyan-400 font-semibold">
                        {game.leaderboard_count}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono mt-2">
                      <span className="text-neutral-500">Created</span>
                      <span className="text-neutral-600">
                        {new Date(game.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
