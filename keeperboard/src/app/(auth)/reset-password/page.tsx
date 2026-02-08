'use client';

import { requestPasswordReset } from '../actions';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const recoveryError = searchParams.get('error') === 'recovery';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordReset(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      setSuccess(true);
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <h2 className="text-3xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2">
          Reset Password
        </h2>
        <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-transparent" />
        <p className="mt-4 text-neutral-400 font-mono text-sm">
          Enter your email and we&apos;ll send a recovery link.
        </p>
      </div>

      {recoveryError && (
        <div className="mb-4 p-4 bg-yellow-500/10 border-2 border-yellow-500/50 relative">
          <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-yellow-500" />
          <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-yellow-500" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-yellow-500" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-yellow-500" />
          <p className="text-yellow-300 text-sm font-mono">
            That recovery link is invalid or expired. Request a new one.
          </p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-cyan-500/10 border-2 border-cyan-500/50 relative">
          <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500" />
          <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500" />
          <p className="text-cyan-300 text-sm font-mono">
            If an account exists for that email, you&apos;ll get a reset link shortly.
          </p>
        </div>
      )}

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
          type="email"
          id="email"
          name="email"
          label="Email"
          placeholder="you@example.com"
          required
        />

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'SENDING LINK...' : success ? 'SEND ANOTHER LINK' : 'SEND RESET LINK'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-mono text-neutral-500">
        Remembered your password?{' '}
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
          Sign in →
        </Link>
      </p>
    </Card>
  );
}
