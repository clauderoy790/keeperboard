'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import ImportWizard from '@/components/dashboard/ImportWizard';
import Button from '@/components/ui/Button';

export default function ImportScoresPage({
  params,
}: {
  params: Promise<{ gameId: string; leaderboardId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const handleComplete = () => {
    // Navigate back to leaderboard detail page
    router.push(
      `/dashboard/games/${resolvedParams.gameId}/leaderboards/${resolvedParams.leaderboardId}`
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2">
            Import Scores
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-cyan-500 to-transparent mb-2" />
          <p className="text-sm font-mono text-neutral-500">
            Import scores from CSV or JSON
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() =>
            router.push(
              `/dashboard/games/${resolvedParams.gameId}/leaderboards/${resolvedParams.leaderboardId}`
            )
          }
        >
          ← Back to Leaderboard
        </Button>
      </div>

      {/* Import wizard */}
      <ImportWizard
        gameId={resolvedParams.gameId}
        leaderboardId={resolvedParams.leaderboardId}
        onComplete={handleComplete}
      />
    </div>
  );
}
