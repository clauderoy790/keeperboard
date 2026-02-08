'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface GameFormProps {
  initialData?: {
    name: string;
    description?: string;
  };
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
}

export default function GameForm({
  initialData,
  onSubmit,
  submitLabel = 'Create Game',
  loading = false
}: GameFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name) {
      setError('Name is required');
      return;
    }

    try {
      await onSubmit({ name, description });
    } catch (err: any) {
      setError(err.message || 'Failed to save game');
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
        label="Game Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="My Awesome Game"
        required
        helperText="The display name for your game"
      />

      <div>
        <label className="block text-xs font-mono font-semibold text-cyan-400 mb-2 tracking-widest uppercase">
          Description (Optional)
        </label>
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of your game..."
            rows={4}
            className="
              w-full px-4 py-2.5 bg-neutral-900/50 border-2 border-cyan-500/20
              focus:border-cyan-500/60 text-neutral-100 font-mono text-sm
              placeholder:text-neutral-600 placeholder:font-mono
              focus:outline-none focus:ring-2 focus:ring-cyan-500/20
              transition-all duration-200 shadow-inner resize-none
            "
          />
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500/40 pointer-events-none" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500/40 pointer-events-none" />
        </div>
      </div>

      <Button
        type="submit"
        loading={loading}
        className="w-full"
        size="lg"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
