import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already logged in, go straight to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          KeeperBoard
        </div>
        <nav className="flex gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Free Leaderboards for <span className="text-indigo-600 dark:text-indigo-400">Indie Games</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Add competitive leaderboards to your game in minutes. No credit card, no servers, no hassle.
            Built for indie developers who want to focus on making great games.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold text-lg"
            >
              Start Building Free
            </Link>
            <a
              href="https://github.com/yourusername/keeper-board"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-semibold text-lg"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Quick Integration
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Add leaderboards to your Phaser, Unity, or any web game with our TypeScript SDK.
              5 minutes from signup to live leaderboard.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🎮</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Multiple Environments
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Separate dev, staging, and production leaderboards. Test without polluting
              your live data. Just like the big platforms.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Full Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              View scores, manage players, import existing data, and monitor your game's
              competitive scene from a clean web interface.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Secure by Default
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              API key authentication, rate limiting, and proper input validation.
              Your leaderboards are protected from spam and abuse.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              100% Free & Open Source
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              No pricing tiers, no feature gates, no credit card required.
              Deploy your own instance or use ours. MIT licensed.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Easy Data Migration
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Importing from Unity Gaming Services or another platform?
              Upload CSV/JSON and migrate your existing leaderboards in seconds.
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-24 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Built with Modern Tools
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            Next.js 16, Supabase, TypeScript, Tailwind CSS. Deployed on Vercel.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">Next.js</span>
            <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">Supabase</span>
            <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">TypeScript</span>
            <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">Tailwind CSS</span>
            <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow">Vercel</span>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 max-w-3xl mx-auto text-center bg-indigo-600 dark:bg-indigo-700 p-12 rounded-2xl">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Add Leaderboards?
          </h2>
          <p className="text-indigo-100 mb-8 text-lg">
            Join indie developers who are building competitive experiences without the enterprise price tag.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition font-semibold text-lg"
          >
            Create Your Account
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-24 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2026 KeeperBoard. Open source and free forever.</p>
        </div>
      </footer>
    </div>
  );
}
