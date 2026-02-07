'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ApiKey {
  id: string;
  environment_id: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string | null;
}

interface Environment {
  id: string;
  name: string;
  slug: string;
  is_default: boolean;
}

interface ApiKeysCardProps {
  gameId: string;
  apiKeys: ApiKey[];
  environments: Environment[];
  onKeyGenerated: () => void;
}

export default function ApiKeysCard({
  gameId,
  apiKeys,
  environments,
  onKeyGenerated,
}: ApiKeysCardProps) {
  const [generatedKey, setGeneratedKey] = useState<{
    envName: string;
    key: string;
  } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateKey = async (
    environmentId: string,
    environmentName: string,
    isRegenerate: boolean
  ) => {
    if (
      isRegenerate &&
      !confirm(
        `Are you sure you want to regenerate the ${environmentName} API key?\n\nThe old key will stop working immediately. Any applications using it will break until updated with the new key.`
      )
    ) {
      return;
    }

    setLoading(environmentId);
    setError(null);
    setGeneratedKey(null);

    try {
      const response = await fetch(`/api/games/${gameId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment_id: environmentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate API key');
      }

      setGeneratedKey({ envName: environmentName, key: data.api_key.key });
      onKeyGenerated();
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

        {/* Environment API Keys */}
        {environments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm font-mono text-neutral-500">
              No environments available. Create an environment first.
            </p>
          </div>
        ) : (
          environments.map((env) => {
            const existingKey = apiKeys.find(
              (k) => k.environment_id === env.id
            );

            return (
              <div
                key={env.id}
                className="p-4 bg-neutral-900/30 border border-cyan-500/10"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-mono font-semibold text-cyan-400 uppercase tracking-wider text-sm">
                      {env.name}
                    </h4>
                    {env.is_default && (
                      <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 text-green-400 text-xs font-mono uppercase tracking-wider">
                        ✓ Default
                      </span>
                    )}
                  </div>
                  {existingKey && (
                    <span className="text-xs font-mono text-neutral-500">
                      Created{' '}
                      {existingKey.created_at
                        ? new Date(existingKey.created_at).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  )}
                </div>

                {existingKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <code className="flex-1 px-3 py-2 bg-neutral-900/50 text-neutral-400 font-mono text-sm border border-neutral-700">
                        {existingKey.key_prefix}
                        ••••••••••••••••••••••••••••••••••••••••••••
                      </code>
                    </div>
                    {existingKey.last_used_at && (
                      <p className="text-xs font-mono text-neutral-600">
                        Last used:{' '}
                        {new Date(existingKey.last_used_at).toLocaleString()}
                      </p>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => generateKey(env.id, env.name, true)}
                      loading={loading === env.id}
                      className="w-full"
                    >
                      Regenerate {env.name} Key
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => generateKey(env.id, env.name, false)}
                    loading={loading === env.id}
                    className="w-full"
                  >
                    Generate {env.name} Key
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
