import crypto from 'crypto';

/**
 * Generates a cryptographically secure signing secret.
 * Returns a 32-byte random value, base64 encoded.
 */
export function generateSigningSecret(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Multi-step signature validation matching SDK's algorithm.
 * Designed to be tedious to reverse-engineer from minified/obfuscated code.
 *
 * Steps:
 * 1. Derive key from secret + player GUID prefix
 * 2. Create payload with transformed values (reversed, XORed)
 * 3. HMAC the payload
 * 4. XOR result with timestamp bytes
 * 5. Custom base64 encode
 */
export function validateSignature(
  params: {
    playerGuid: string;
    timestamp: number;
    score?: number;
    runId?: string;
  },
  signature: string,
  secret: string
): boolean {
  try {
    const expected = generateSignature(params, secret);

    // Use timing-safe comparison to prevent timing attacks
    if (signature.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Generates the expected signature for given params.
 * Used by validateSignature and can be used for testing.
 */
export function generateSignature(
  params: {
    playerGuid: string;
    timestamp: number;
    score?: number;
    runId?: string;
  },
  secret: string
): string {
  // Step 1: Derive key from secret + player GUID prefix
  const derivedKey = crypto
    .createHmac('sha256', secret)
    .update(params.playerGuid.slice(0, 8))
    .digest();

  // Step 2: Build payload with transformations
  const parts = [params.playerGuid];
  if (params.runId) {
    // Reverse the runId
    parts.push(params.runId.split('').reverse().join(''));
  }
  if (params.score !== undefined) {
    // XOR score with magic number
    parts.push(String(params.score ^ 0xbeef));
  }
  // XOR timestamp with different magic number
  parts.push(String(params.timestamp ^ 0xdead));
  const payload = parts.join('::');

  // Step 3: HMAC the payload
  const hmac = crypto.createHmac('sha256', derivedKey).update(payload).digest('hex');

  // Step 4: XOR with timestamp string
  const tsStr = String(params.timestamp);
  const xored = hmac
    .split('')
    .map((c, i) => {
      const tsChar = tsStr[i % tsStr.length];
      return String.fromCharCode(c.charCodeAt(0) ^ tsChar.charCodeAt(0));
    })
    .join('');

  // Step 5: Custom base64 (URL-safe, no padding)
  return Buffer.from(xored, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// --- Replay Protection ---

// In-memory cache for used timestamps (player_guid:timestamp)
// Entries expire after 2 minutes (longer than the 60s validity window)
const usedTimestamps = new Map<string, number>();
const TIMESTAMP_TTL_MS = 2 * 60 * 1000; // 2 minutes
const TIMESTAMP_MAX_AGE_MS = 60 * 1000; // 60 seconds

// Cleanup old entries periodically
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanupRunning() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, expiresAt] of usedTimestamps.entries()) {
      if (now > expiresAt) {
        usedTimestamps.delete(key);
      }
    }
    // Stop interval if map is empty
    if (usedTimestamps.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, 30000); // Cleanup every 30 seconds
}

/**
 * Validates timestamp freshness and prevents replay attacks.
 * Returns null if valid, or an error message if invalid.
 */
export function validateTimestamp(
  timestamp: number,
  playerGuid: string
): string | null {
  const now = Date.now();

  // Check if timestamp is too old
  if (now - timestamp > TIMESTAMP_MAX_AGE_MS) {
    return 'Timestamp expired (>60 seconds old)';
  }

  // Check if timestamp is in the future (with small tolerance for clock skew)
  if (timestamp > now + 5000) {
    return 'Timestamp is in the future';
  }

  // Check for replay
  const key = `${playerGuid}:${timestamp}`;
  if (usedTimestamps.has(key)) {
    return 'Request replay detected';
  }

  // Mark as used
  usedTimestamps.set(key, now + TIMESTAMP_TTL_MS);
  ensureCleanupRunning();

  return null;
}
