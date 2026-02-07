'use client';

import { signUp } from '../actions';
import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-3">
            Check Your Email
          </h2>
          <div className="h-1 w-24 bg-gradient-to-r from-cyan-500 to-transparent mx-auto mb-4" />
          <p className="text-neutral-400 font-mono text-sm mb-6">
            We&apos;ve sent you a confirmation email.<br />
            Click the link to verify your account.
          </p>
          <Link href="/login">
            <Button size="lg">
              Go to Login
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6">
        <h2 className="text-3xl font-mono font-bold text-cyan-400 tracking-wider uppercase mb-2">
          Create Account
        </h2>
        <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-transparent" />
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
          type="email"
          id="email"
          name="email"
          label="Email"
          placeholder="you@example.com"
          required
        />

        <Input
          type="password"
          id="password"
          name="password"
          label="Password"
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
          {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm font-mono text-neutral-500">
        Already have an account?{' '}
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
          Sign in →
        </Link>
      </p>
    </Card>
  );
}
