'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface AntiCheatCardProps {
  gameId: string;
}

export default function AntiCheatCard({ gameId }: AntiCheatCardProps) {
  const [signingEnabled, setSigningEnabled] = useState(false);
  const [signingSecret, setSigningSecret] = useState<string | null>(null);
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    fetchSigningStatus();
  }, [gameId]);

  const fetchSigningStatus = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/signing-secret`);
      const data = await response.json();

      if (response.ok) {
        setSigningEnabled(data.signing_enabled);
        setHasSecret(data.has_secret);
        // Only set secret if it was just generated (first load after generation)
        if (data.signing_secret) {
          setSigningSecret(data.signing_secret);
        }
      }
    } catch (error) {
      console.error('Failed to fetch signing status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSigning = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/games/${gameId}/signing-secret`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signing_enabled: !signingEnabled }),
      });

      const data = await response.json();

      if (response.ok) {
        setSigningEnabled(data.signing_enabled);
        if (data.signing_secret) {
          setSigningSecret(data.signing_secret);
          setHasSecret(true);
          setShowSecret(true);
        }
      } else {
        alert(data.error || 'Failed to update signing settings');
      }
    } catch (error) {
      console.error('Failed to toggle signing:', error);
      alert('Failed to update signing settings');
    } finally {
      setUpdating(false);
    }
  };

  const handleRegenerateSecret = async () => {
    if (
      !confirm(
        'Are you sure you want to regenerate the signing secret?\n\nThis will invalidate the current secret. You will need to update your game with the new secret.'
      )
    ) {
      return;
    }

    setRegenerating(true);
    try {
      const response = await fetch(`/api/games/${gameId}/signing-secret`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSigningSecret(data.signing_secret);
        setHasSecret(true);
        setShowSecret(true);
        setCopied(false);
      } else {
        alert(data.error || 'Failed to regenerate secret');
      }
    } catch (error) {
      console.error('Failed to regenerate secret:', error);
      alert('Failed to regenerate secret');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopySecret = async () => {
    if (!signingSecret) return;

    try {
      await navigator.clipboard.writeText(signingSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (loading) {
    return (
      <Card title="Anti-Cheat Settings">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Anti-Cheat Settings"
      description="Protect your leaderboard from fake scores"
    >
      <div className="space-y-6">
        {/* Signing Toggle */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={signingEnabled}
              onChange={handleToggleSigning}
              disabled={updating}
              className="w-5 h-5 accent-cyan-500 cursor-pointer"
            />
            <span className="text-cyan-400 text-sm font-mono uppercase tracking-wider group-hover:text-cyan-300 transition-colors">
              Enable HMAC Signing
            </span>
            {updating && (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500 border-t-transparent"></span>
            )}
          </label>
          <p className="text-neutral-500 text-xs font-mono pl-8">
            Require cryptographic signatures on score submissions to prevent tampering
          </p>
        </div>

        {/* Signing Secret Section */}
        {signingEnabled && (
          <div className="space-y-3 p-4 bg-neutral-800/50 border border-cyan-500/20 rounded">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Signing Secret
              </label>
              <div className="flex gap-2">
                {signingSecret && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? 'Hide' : 'Show'}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRegenerateSecret}
                  loading={regenerating}
                >
                  {hasSecret ? 'Regenerate' : 'Generate'}
                </Button>
              </div>
            </div>

            {signingSecret && showSecret ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-neutral-900 border border-cyan-500/30 text-cyan-300 text-xs font-mono break-all">
                    {signingSecret}
                  </code>
                  <Button variant="ghost" size="sm" onClick={handleCopySecret}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                  <p className="text-amber-400 text-xs font-mono">
                    ⚠️ Keep this secret safe! Embed it in your game build and never expose it publicly.
                    This secret will be hidden after you leave this page.
                  </p>
                </div>
              </div>
            ) : hasSecret ? (
              <p className="text-neutral-500 text-xs font-mono">
                Secret is configured. Click "Show" to reveal or "Regenerate" to create a new one.
              </p>
            ) : (
              <p className="text-neutral-500 text-xs font-mono">
                No secret generated yet. Click "Generate" to create one.
              </p>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-neutral-800/30 border border-neutral-700/50 rounded">
          <p className="text-neutral-400 text-xs font-mono leading-relaxed">
            When signing is enabled, the SDK will sign each request with the secret.
            The server validates these signatures to ensure scores haven&apos;t been tampered with.
            This blocks casual cheaters using browser DevTools.
          </p>
        </div>
      </div>
    </Card>
  );
}
