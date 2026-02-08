import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch stats
  const { data: games, count: gamesCount } = await supabase
    .from('games')
    .select('id', { count: 'exact' })
    .eq('user_id', user.id);

  const gameIds = (games || []).map((game) => game.id);

  const { data: leaderboards, count: leaderboardsCount } =
    gameIds.length > 0
      ? await supabase
          .from('leaderboards')
          .select('id', { count: 'exact' })
          .in('game_id', gameIds)
      : { data: [], count: 0 };

  const leaderboardIds = (leaderboards || []).map(
    (leaderboard) => leaderboard.id,
  );

  const { count: scoresCount } =
    leaderboardIds.length > 0
      ? await supabase
          .from('scores')
          .select('id', { count: 'exact', head: true })
          .in('leaderboard_id', leaderboardIds)
      : { count: 0 };

  const totalGames = gamesCount || 0;
  const totalLeaderboards = leaderboardsCount || 0;
  const totalScores = scoresCount || 0;

  // Fetch recent games
  const { data: recentGames } = await supabase
    .from('games')
    .select('id, name, slug, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const displayName =
    user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';

  return (
    <div className='space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700'>
      {/* Welcome section */}
      <div className='relative'>
        <div className='absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent blur-xl' />
        <div className='relative'>
          <h1 className='text-4xl lg:text-5xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2'>
            Welcome back,
            <br />
            <span className='text-cyan-300'>{displayName}</span>
          </h1>
          <div className='h-1 w-32 bg-gradient-to-r from-cyan-500 to-transparent' />
        </div>
      </div>

      {/* Stats grid */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <Card
          glowEffect
          className='transform hover:scale-105 transition-transform duration-300'
        >
          <div className='text-center'>
            <div className='text-5xl font-mono font-bold text-cyan-400 mb-2'>
              {totalGames.toLocaleString()}
            </div>
            <div className='text-sm font-mono text-neutral-400 uppercase tracking-widest'>
              Total Games
            </div>
          </div>
        </Card>

        <Card
          glowEffect
          className='transform hover:scale-105 transition-transform duration-300'
          style={{ animationDelay: '100ms' }}
        >
          <div className='text-center'>
            <div className='text-5xl font-mono font-bold text-cyan-400 mb-2'>
              {totalLeaderboards.toLocaleString()}
            </div>
            <div className='text-sm font-mono text-neutral-400 uppercase tracking-widest'>
              Leaderboards
            </div>
          </div>
        </Card>

        <Card
          glowEffect
          className='transform hover:scale-105 transition-transform duration-300'
          style={{ animationDelay: '200ms' }}
        >
          <div className='text-center'>
            <div className='text-5xl font-mono font-bold text-cyan-400 mb-2'>
              {totalScores.toLocaleString()}
            </div>
            <div className='text-sm font-mono text-neutral-400 uppercase tracking-widest'>
              Total Scores
            </div>
          </div>
        </Card>
      </div>

      {/* Recent games or CTA */}
      {totalGames === 0 ? (
        <Card
          title='Get Started'
          description='Create your first game to start tracking leaderboards'
          className='text-center'
        >
          <div className='py-8'>
            <div className='mb-6'>
              <svg
                className='w-24 h-24 mx-auto text-cyan-500/30'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z'
                />
              </svg>
            </div>
            <Link href='/dashboard/games'>
              <Button size='lg' className='mx-auto'>
                Create Your First Game
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card
          title='Recent Games'
          description='Your recently created games'
          footer={
            <Link href='/dashboard/games'>
              <Button variant='ghost' size='sm' className='w-full'>
                View All Games →
              </Button>
            </Link>
          }
        >
          <div className='space-y-3'>
            {recentGames?.map((game, index) => (
              <Link
                key={game.id}
                href={`/dashboard/games/${game.id}`}
                className='block p-4 bg-neutral-900/30 border border-cyan-500/10 hover:border-cyan-500/30 transition-all duration-200 group'
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='font-mono font-semibold text-cyan-400 group-hover:text-cyan-300 transition-colors'>
                      {game.name}
                    </h4>
                    <p className='text-xs font-mono text-neutral-500 mt-1'>
                      /{game.slug}
                    </p>
                  </div>
                  <div className='text-xs font-mono text-neutral-600'>
                    {game.created_at
                      ? new Date(game.created_at).toLocaleDateString()
                      : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Quick links */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <Card className='group hover:scale-105 transition-transform duration-300'>
          <Link href='/dashboard/games' className='block'>
            <div className='flex items-center gap-4'>
              <div className='p-4 bg-cyan-500/10 border-2 border-cyan-500/30 group-hover:border-cyan-500 group-hover:bg-cyan-500/20 transition-all'>
                <svg
                  className='w-8 h-8 text-cyan-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6v6m0 0v6m0-6h6m-6 0H6'
                  />
                </svg>
              </div>
              <div>
                <h3 className='font-mono font-bold text-cyan-400 uppercase tracking-wider'>
                  New Game
                </h3>
                <p className='text-sm font-mono text-neutral-500 mt-1'>
                  Create a new game project
                </p>
              </div>
            </div>
          </Link>
        </Card>

        <Card className='group hover:scale-105 transition-transform duration-300'>
          <a
            href='https://github.com/clauderoy790/keeperboard'
            target='_blank'
            rel='noopener noreferrer'
            className='block'
          >
            <div className='flex items-center gap-4'>
              <div className='p-4 bg-cyan-500/10 border-2 border-cyan-500/30 group-hover:border-cyan-500 group-hover:bg-cyan-500/20 transition-all'>
                <svg
                  className='w-8 h-8 text-cyan-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
                  />
                </svg>
              </div>
              <div>
                <h3 className='font-mono font-bold text-cyan-400 uppercase tracking-wider'>
                  Documentation
                </h3>
                <p className='text-sm font-mono text-neutral-500 mt-1'>
                  API reference & guides
                </p>
              </div>
            </div>
          </a>
        </Card>
      </div>
    </div>
  );
}
