import Card from '@/components/ui/Card';

export default function GamesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2">
          Games
        </h1>
        <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-transparent" />
      </div>

      <Card className="text-center py-12">
        <div className="text-cyan-500/30 mb-4">
          <svg className="w-20 h-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        </div>
        <h3 className="text-xl font-mono font-bold text-neutral-400 mb-2">
          Games Management - Coming in Phase 7
        </h3>
        <p className="text-sm font-mono text-neutral-600">
          This page will allow you to create and manage your games.
        </p>
      </Card>
    </div>
  );
}
