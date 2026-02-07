import { createAdminClient } from '@/lib/supabase/admin';
import { createHash } from 'crypto';
import { checkRateLimit } from './rate-limit';

export interface ApiKeyValidationResult {
  gameId: string;
  environmentId: string;
  environmentSlug: string;
  rateLimitHeaders: Record<string, string>;
}

/**
 * Validates an API key from the X-API-Key header and returns associated game/environment context.
 *
 * @param request - The incoming request
 * @returns ApiKeyValidationResult if valid, or throws an error
 * @throws Error with message describing the validation failure
 */
export async function validateApiKey(
  request: Request
): Promise<ApiKeyValidationResult> {
  // Extract API key from header
  const apiKey = request.headers.get('X-API-Key');

  if (!apiKey) {
    throw new Error('Missing X-API-Key header');
  }

  // Validate key format (kb_{env}_{random})
  if (!apiKey.startsWith('kb_')) {
    throw new Error('Invalid API key format');
  }

  // Check rate limit
  const rateLimit = checkRateLimit(apiKey);
  const rateLimitHeaders = {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimit.resetAt / 1000).toString(),
  };

  if (!rateLimit.allowed) {
    const error = new Error('Rate limit exceeded') as Error & {
      code: string;
      headers: Record<string, string>;
    };
    error.code = 'RATE_LIMITED';
    error.headers = rateLimitHeaders;
    throw error;
  }

  // Hash the key for lookup
  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  // Look up API key in database
  const supabase = createAdminClient();
  const { data: apiKeyData, error } = await supabase
    .from('api_keys')
    .select(
      `
      id,
      game_id,
      environment_id,
      environments (
        id,
        slug
      )
    `
    )
    .eq('key_hash', keyHash)
    .single();

  if (error || !apiKeyData) {
    throw new Error('Invalid API key');
  }

  // Update last_used_at timestamp (fire and forget, don't await)
  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKeyData.id)
    .then(() => {});

  // Extract environment data
  const environment = apiKeyData.environments as unknown as {
    id: string;
    slug: string;
  };

  return {
    gameId: apiKeyData.game_id,
    environmentId: apiKeyData.environment_id,
    environmentSlug: environment.slug,
    rateLimitHeaders,
  };
}
