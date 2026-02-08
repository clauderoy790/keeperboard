'use client';

import { updatePassword } from '../actions';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        router.replace('/reset-password?error=recovery');
        return;
      }

      if (isMounted) {
        setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updatePassword(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <h2 className="text-3xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2">
            Verifying Session
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-transparent" />
          <p className="mt-4 text-neutral-400 font-mono text-sm">
            One moment while we confirm your recovery link.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <h2 className="text-3xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2">
          Set New Password
        </h2>
        <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-transparent" />
        <p className="mt-4 text-neutral-400 font-mono text-sm">
          Choose a strong password to secure your account.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border-2 border-red-500/50 relative">
          <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-red-500" />
          <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-red-500" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-red-500" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-red-500" />
          <p className="text-red-400 text-sm font-mono">⚠ {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          id="password"
          name="password"
          label="New Password"
          placeholder="••••••••"
          helperText="At least 6 characters"
          required
          minLength={6}
        />

        <Input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="••••••••"
          required
          minLength={6}
        />

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-mono text-neutral-500">
        Need a new link?{' '}
        <Link href="/reset-password" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
          Request reset →
        </Link>
      </p>
    </Card>
  );
}
