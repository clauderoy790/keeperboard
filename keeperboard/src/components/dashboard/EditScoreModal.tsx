'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Score {
  id: string;
  player_guid: string | null;
  player_name: string;
  score: number;
  rank: number;
  created_at: string;
}

interface EditScoreModalProps {
  score: Score;
  onSave: (id: string, data: { player_name: string; score: number }) => Promise<void>;
  onClose: () => void;
}

export default function EditScoreModal({
  score,
  onSave,
  onClose,
}: EditScoreModalProps) {
  const [playerName, setPlayerName] = useState(score.player_name);
  const [scoreValue, setScoreValue] = useState(score.score.toString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!playerName.trim()) {
      setError('Player name is required');
      return;
    }

    const numScore = parseInt(scoreValue, 10);
    if (isNaN(numScore)) {
      setError('Score must be a valid number');
      return;
    }

    setSaving(true);
    try {
      await onSave(score.id, {
        player_name: playerName.trim(),
        score: numScore,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-neutral-900 border-2 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)]">
        {/* Corner decorations */}
        <span className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-500" />
        <span className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-500" />
        <span className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-cyan-500" />
        <span className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-500" />

        <div className="p-6">
          {/* Header */}
          <div className="mb-6 border-b border-cyan-500/20 pb-4">
            <h3 className="text-lg font-mono font-bold text-cyan-400 tracking-wider uppercase">
              Edit Score
            </h3>
            <p className="text-sm font-mono text-neutral-500 mt-1">
              Rank #{score.rank}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Player Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter player name"
            />

            <Input
              label="Score"
              type="number"
              value={scoreValue}
              onChange={(e) => setScoreValue(e.target.value)}
              placeholder="Enter score"
            />

            {score.player_guid && (
              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-500 mb-2 tracking-widest uppercase">
                  Player GUID
                </label>
                <p className="text-sm font-mono text-neutral-400 truncate">
                  {score.player_guid}
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm font-mono text-red-400">⚠ {error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={saving}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
