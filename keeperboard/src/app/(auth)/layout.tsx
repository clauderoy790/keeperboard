import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KeeperBoard - Authentication',
  description: 'Login or register for KeeperBoard',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background grid effect */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Animated glow orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div
        className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse pointer-events-none"
        style={{ animationDelay: '1s' }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-3">
            KEEPER
            <span className="text-cyan-300">BOARD</span>
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-cyan-500 to-transparent mx-auto mb-3" />
          <p className="text-neutral-500 font-mono text-sm tracking-wider uppercase">
            Leaderboards for indie games
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
