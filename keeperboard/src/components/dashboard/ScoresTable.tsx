'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EditScoreModal from './EditScoreModal';

interface Score {
  id: string;
  player_guid: string | null;
  player_name: string;
  score: number;
  rank: number;
  created_at: string;
  updated_at: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface ScoresTableProps {
  gameId: string;
  leaderboardId: string;
  version?: number;
  onScoreCountChange?: (count: number) => void;
}

export default function ScoresTable({
  gameId,
  leaderboardId,
  version,
  onScoreCountChange,
}: ScoresTableProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [editingScore, setEditingScore] = useState<Score | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check if viewing a historical version (read-only mode)
  const isReadOnly = version !== undefined;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (searchDebounced) {
        params.set('search', searchDebounced);
      }
      if (version !== undefined) {
        params.set('version', version.toString());
      }

      const response = await fetch(
        `/api/games/${gameId}/leaderboards/${leaderboardId}/scores?${params}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch scores');
      }

      setScores(data.scores);
      setPagination(data.pagination);
      onScoreCountChange?.(data.pagination.totalCount);
    } catch (error) {
      console.error('Failed to fetch scores:', error);
    } finally {
      setLoading(false);
    }
  }, [gameId, leaderboardId, pagination.page, pagination.pageSize, searchDebounced, version, onScoreCountChange]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchDebounced]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize: newSize, page: 1 }));
  };

  const handleEditSave = async (
    id: string,
    data: { player_name: string; score: number }
  ) => {
    const response = await fetch(
      `/api/games/${gameId}/leaderboards/${leaderboardId}/scores/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Failed to update score');
    }

    await fetchScores();
  };

  const handleDelete = async (score: Score) => {
    if (
      !confirm(
        `Delete score for "${score.player_name}"?\n\nScore: ${score.score}\nRank: #${score.rank}\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(score.id);
    try {
      const response = await fetch(
        `/api/games/${gameId}/leaderboards/${leaderboardId}/scores/${score.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete score');
      }

      await fetchScores();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && scores.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search by name or GUID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-mono text-neutral-500">
          <span>Show:</span>
          {[10, 25, 50].map((size) => (
            <button
              key={size}
              onClick={() => handlePageSizeChange(size)}
              className={`px-2 py-1 ${
                pagination.pageSize === size
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {scores.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-lg font-mono text-neutral-500">
            {searchDebounced ? 'No scores match your search' : 'No scores yet'}
          </p>
          <p className="text-sm font-mono text-neutral-600 mt-2">
            {searchDebounced
              ? 'Try a different search term'
              : 'Scores will appear here when players submit them'}
          </p>
        </div>
      )}

      {/* Table */}
      {scores.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyan-500/20">
                <th className="text-left py-3 px-4 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="text-left py-3 px-4 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  Player Name
                </th>
                <th className="text-left py-3 px-4 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider hidden md:table-cell">
                  Player GUID
                </th>
                <th className="text-right py-3 px-4 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  Score
                </th>
                <th className="text-left py-3 px-4 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider hidden lg:table-cell">
                  Date
                </th>
                <th className="text-right py-3 px-4 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr
                  key={score.id}
                  className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                >
                  <td className="py-3 px-4 text-sm font-mono text-neutral-300">
                    #{score.rank}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-neutral-200 font-semibold">
                    {score.player_name}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-neutral-500 hidden md:table-cell max-w-[150px] truncate">
                    {score.player_guid || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-cyan-400 font-bold text-right">
                    {score.score.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-neutral-500 hidden lg:table-cell">
                    {formatDate(score.created_at)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!isReadOnly ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingScore(score)}
                          className="p-1.5 text-neutral-400 hover:text-cyan-400 transition-colors"
                          title="Edit score"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(score)}
                          disabled={deletingId === score.id}
                          className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete score"
                        >
                          {deletingId === score.id ? (
                            <svg
                              className="w-4 h-4 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-neutral-600">Read-only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
          <p className="text-sm font-mono text-neutral-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
            {Math.min(
              pagination.page * pagination.pageSize,
              pagination.totalCount
            )}{' '}
            of {pagination.totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              ← Prev
            </Button>
            <span className="text-sm font-mono text-neutral-400 px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && scores.length > 0 && (
        <div className="absolute inset-0 bg-neutral-900/50 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      )}

      {/* Edit Modal */}
      {editingScore && (
        <EditScoreModal
          score={editingScore}
          onSave={handleEditSave}
          onClose={() => setEditingScore(null)}
        />
      )}
    </div>
  );
}
