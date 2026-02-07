'use client';

import { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface GameFormProps {
  initialData?: {
    name: string;
    slug: string;
    description?: string;
  };
  onSubmit: (data: { name: string; slug: string; description: string }) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
}

// Convert name to slug format (lowercase, hyphens only)
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function GameForm({
  initialData,
  onSubmit,
  submitLabel = 'Create Game',
  loading = false
}: GameFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(nameToSlug(name));
    }
  }, [name, slugManuallyEdited]);

  const validateSlug = (value: string): boolean => {
    return /^[a-z0-9-]+$/.test(value);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSlug(value);
    setSlugManuallyEdited(true);

    if (value && !validateSlug(value)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens');
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !slug) {
      setError('Name and slug are required');
      return;
    }

    if (!validateSlug(slug)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    try {
      await onSubmit({ name, slug, description });
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

      <Input
        label="Slug"
        type="text"
        value={slug}
        onChange={handleSlugChange}
        placeholder="my-awesome-game"
        required
        helperText="URL-friendly identifier (lowercase, hyphens only)"
        error={error && error.includes('Slug') ? error : undefined}
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
