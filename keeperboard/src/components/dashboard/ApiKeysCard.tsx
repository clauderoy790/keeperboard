'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ApiKey {
  id: string;
  environment: 'dev' | 'prod';
  key_prefix: string;
  last_used_at: string | null;
  created_at: string | null;
}

interface ApiKeysCardProps {
  gameId: string;
  apiKeys: ApiKey[];
  onKeyGenerated: () => void;
  onKeyDeleted: () => void;
}

export default function ApiKeysCard({ gameId, apiKeys, onKeyGenerated, onKeyDeleted }: ApiKeysCardProps) {
  const [generatedKey, setGeneratedKey] = useState<{ env: string; key: string } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const devKey = apiKeys.find(k => k.environment === 'dev');
  const prodKey = apiKeys.find(k => k.environment === 'prod');

  const generateKey = async (environment: 'dev' | 'prod') => {
    setLoading(environment);
    setError(null);
    setGeneratedKey(null);

    try {
      const response = await fetch(`/api/games/${gameId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate API key');
      }

      setGeneratedKey({ env: environment, key: data.api_key.key });
      onKeyGenerated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const deleteKey = async (environment: 'dev' | 'prod') => {
    if (!confirm(`Are you sure you want to delete the ${environment} API key? This action cannot be undone and will break any applications using this key.`)) {
      return;
    }

    setLoading(`delete-${environment}`);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/api-keys`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete API key');
      }

      onKeyDeleted();
      if (generatedKey?.env === environment) {
        setGeneratedKey(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card title="API Keys" description="Generate and manage API keys for your game">
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border-2 border-red-500/50 relative">
            <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-red-500" />
            <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-red-500" />
            <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-red-500" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-red-500" />
            <p className="text-red-400 text-sm font-mono">⚠ {error}</p>
          </div>
        )}

        {/* Newly generated key display */}
        {generatedKey && (
          <div className="p-4 bg-cyan-500/10 border-2 border-cyan-500/50 relative animate-in fade-in">
            <span className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-cyan-500" />
            <span className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-cyan-500" />
            <span className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-cyan-500" />
            <span className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-cyan-500" />
            <div className="space-y-3">
              <p className="text-sm font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                ⚠ Save this key - it won&apos;t be shown again!
              </p>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-neutral-900/50 text-cyan-300 font-mono text-sm break-all border border-cyan-500/30">
                  {generatedKey.key}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(generatedKey.key)}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Development Key */}
        <div className="p-4 bg-neutral-900/30 border border-cyan-500/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-mono font-semibold text-cyan-400 uppercase tracking-wider text-sm">
              Development
            </h4>
            {devKey && (
              <span className="text-xs font-mono text-neutral-500">
                Created {devKey.created_at ? new Date(devKey.created_at).toLocaleDateString() : 'N/A'}
              </span>
            )}
          </div>

          {devKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <code className="flex-1 px-3 py-2 bg-neutral-900/50 text-neutral-400 font-mono text-sm border border-neutral-700">
                  {devKey.key_prefix}••••••••••••••••••••••••••••••••••••••••••••
                </code>
              </div>
              {devKey.last_used_at && (
                <p className="text-xs font-mono text-neutral-600">
                  Last used: {new Date(devKey.last_used_at).toLocaleString()}
                </p>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteKey('dev')}
                loading={loading === 'delete-dev'}
                className="w-full"
              >
                Delete Dev Key
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => generateKey('dev')}
              loading={loading === 'dev'}
              className="w-full"
            >
              Generate Dev Key
            </Button>
          )}
        </div>

        {/* Production Key */}
        <div className="p-4 bg-neutral-900/30 border border-cyan-500/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-mono font-semibold text-cyan-400 uppercase tracking-wider text-sm">
              Production
            </h4>
            {prodKey && (
              <span className="text-xs font-mono text-neutral-500">
                Created {prodKey.created_at ? new Date(prodKey.created_at).toLocaleDateString() : 'N/A'}
              </span>
            )}
          </div>

          {prodKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <code className="flex-1 px-3 py-2 bg-neutral-900/50 text-neutral-400 font-mono text-sm border border-neutral-700">
                  {prodKey.key_prefix}••••••••••••••••••••••••••••••••••••••••••••
                </code>
              </div>
              {prodKey.last_used_at && (
                <p className="text-xs font-mono text-neutral-600">
                  Last used: {new Date(prodKey.last_used_at).toLocaleString()}
                </p>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteKey('prod')}
                loading={loading === 'delete-prod'}
                className="w-full"
              >
                Delete Prod Key
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              onClick={() => generateKey('prod')}
              loading={loading === 'prod'}
              className="w-full"
            >
              Generate Prod Key
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
