/**
 * Platform and analytics dimension handling for the public API.
 *
 * `platform` is developer-supplied via SDK config — it cannot be inferred server-side,
 * because an iOS app running in a WKWebView and Safari on an iPhone are indistinguishable
 * from both the User-Agent and the request. Only the developer knows which build shipped.
 *
 * Validation policy differs by who supplies the value:
 *   - Developer-supplied (`platform`) → reject with 400 on an unrecognized value. A bad
 *     value is a developer bug that surfaces on their first test submission, and failing
 *     loudly is better than silently discarding analytics they think they're collecting.
 *   - Auto-derived (`country`) → coerce to null. Punishing a developer for a user's
 *     unexpected environment would be wrong.
 *
 * Absent is never invalid: scores predating SDK 2.3.0 and any client on SDK <= 2.2.2
 * send nothing, and must keep working.
 */

export const PLATFORMS = [
  'web',
  'ios',
  'android',
  'windows',
  'macos',
  'linux',
] as const;

export type Platform = (typeof PLATFORMS)[number];

/** Max lengths mirror the CHECK constraints in migration 008. */
const MAX_GAME_VERSION_LENGTH = 32;
const MAX_SOURCE_LENGTH = 64;

/**
 * Thrown when `platform` is present but not a recognized value.
 * Callers convert this into a 400 INVALID_PLATFORM response.
 */
export class InvalidPlatformError extends Error {
  constructor(received: unknown) {
    super(
      `Invalid platform ${JSON.stringify(received)}. Expected one of: ${PLATFORMS.join(', ')}`
    );
    this.name = 'InvalidPlatformError';
  }
}

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

/**
 * Normalizes a client-supplied platform value.
 *
 * @returns the lowercased platform, or null when absent.
 * @throws {InvalidPlatformError} when present but unrecognized.
 */
export function normalizePlatform(raw: unknown): Platform | null {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }

  if (typeof raw !== 'string') {
    throw new InvalidPlatformError(raw);
  }

  const normalized = raw.trim().toLowerCase();

  if (normalized === '') {
    return null;
  }

  if (!isPlatform(normalized)) {
    throw new InvalidPlatformError(raw);
  }

  return normalized;
}

/**
 * Resolves the requester's country from Vercel's geo header.
 *
 * Returns null in local development, where the header is absent — that is the correct
 * answer, not a reason to invent a value.
 */
export function resolveCountry(request: Request): string | null {
  const raw = request.headers.get('x-vercel-ip-country');

  if (!raw) return null;

  const normalized = raw.trim().toUpperCase();

  // Vercel sends "XX" for unknown/private addresses; treat it as no data.
  return /^[A-Z]{2}$/.test(normalized) && normalized !== 'XX' ? normalized : null;
}

/**
 * Normalizes an optional free-text dimension supplied by the client.
 * Trims, drops empties, and truncates to the column's CHECK constraint so a long
 * value degrades into truncated data rather than failing the whole submission.
 */
function normalizeFreeText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (trimmed === '') return null;

  return trimmed.slice(0, maxLength);
}

/** Optional build identifier, e.g. "1.4.2". */
export function normalizeGameVersion(raw: unknown): string | null {
  return normalizeFreeText(raw, MAX_GAME_VERSION_LENGTH);
}

/**
 * First-touch acquisition tag from the `?ref=` query param.
 * Restricted to the same character set the SDK produces, so a malformed value
 * cannot fragment the analytics with near-duplicate labels.
 */
export function normalizeSource(raw: unknown): string | null {
  const trimmed = normalizeFreeText(raw, MAX_SOURCE_LENGTH);
  if (trimmed === null) return null;

  const cleaned = trimmed.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return cleaned === '' ? null : cleaned;
}
