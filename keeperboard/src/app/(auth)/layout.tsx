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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">KeeperBoard</h1>
          <p className="text-slate-400">Leaderboards for indie games</p>
        </div>
        {children}
      </div>
    </div>
  );
}
