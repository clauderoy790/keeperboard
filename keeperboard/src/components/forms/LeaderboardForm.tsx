'use client';

import { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface LeaderboardFormProps {
  initialData?: {
    name: string;
    slug: string;
    sort_order: 'asc' | 'desc';
  };
  onSubmit: (data: {
    name: string;
    slug: string;
    sort_order: 'asc' | 'desc';
  }) => Promise<void>;
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

export default function LeaderboardForm({
  initialData,
  onSubmit,
  submitLabel = 'Create Leaderboard',
  loading = false,
}: LeaderboardFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    initialData?.sort_order || 'desc'
  );
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
      await onSubmit({ name, slug, sort_order: sortOrder });
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
        helperText="The display name for this leaderboard"
      />

      <Input
        label="Slug"
        type="text"
        value={slug}
        onChange={handleSlugChange}
        placeholder="high-scores"
        required
        helperText="URL-friendly identifier (lowercase, hyphens only)"
        error={error && error.includes('Slug') ? error : undefined}
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

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
