'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Environment {
  id: string;
  game_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

interface EnvironmentsCardProps {
  gameId: string;
  environments: Environment[];
  onEnvironmentCreated: () => void;
  onEnvironmentDeleted: () => void;
}

export default function EnvironmentsCard({
  gameId,
  environments,
  onEnvironmentCreated,
  onEnvironmentDeleted,
}: EnvironmentsCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Environment name is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/environments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create environment');
      }

      setName('');
      setIsAdding(false);
      onEnvironmentCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (environmentId: string, environmentName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the "${environmentName}" environment?\n\nThis will permanently delete all leaderboards and scores in this environment.`
      )
    ) {
      return;
    }

    setDeleting(environmentId);
    try {
      const response = await fetch(
        `/api/games/${gameId}/environments/${environmentId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete environment');
      }

      onEnvironmentDeleted();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card
      title="Environments"
      description="Separate dev, staging, and production data"
      footer={
        !isAdding && (
          <Button
            variant="secondary"
            onClick={() => setIsAdding(true)}
            className="w-full"
          >
            + Add Environment
          </Button>
        )
      }
    >
      {/* Environment List */}
      <div className="space-y-2">
        {environments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm font-mono text-neutral-500">
              No environments yet
            </p>
          </div>
        ) : (
          environments.map((env) => (
            <div
              key={env.id}
              className="flex items-center justify-between p-3 bg-neutral-900/30 border border-cyan-500/10 hover:border-cyan-500/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-cyan-400">
                      {env.name}
                    </p>
                    {env.is_default && (
                      <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-mono uppercase tracking-wider">
                        ✓ Default
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!env.is_default && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(env.id, env.name)}
                  loading={deleting === env.id}
                >
                  Delete
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Environment Form */}
      {isAdding && (
        <div className="mt-4 pt-4 border-t border-cyan-500/20 space-y-3">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50">
              <p className="text-red-400 text-xs font-mono">⚠ {error}</p>
            </div>
          )}

          <Input
            label="Environment Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Staging"
            helperText="e.g., Development, Staging, Testing"
            autoFocus
          />

          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              loading={creating}
              className="flex-1"
              size="sm"
            >
              Create
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setName('');
                setError(null);
              }}
              className="flex-1"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
