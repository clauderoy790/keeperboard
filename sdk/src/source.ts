/**
 * First-touch acquisition tracking.
 *
 * Reads a `?ref=` tag off the URL the first time a player arrives and stores it next to
 * their GUID, so every run they ever play is attributed to the link that brought them in.
 *
 * @example
 * // You post this link on Reddit:
 * //   https://yourgame.com/?ref=reddit-webgames
 * // Every run that player submits from then on carries source="reddit-webgames",
 * // including when they return later by typing the URL directly.
 *
 * **Why only `?ref=` and not `document.referrer`:** Reddit marks user-submitted links
 * `rel="noreferrer"`, Facebook routes through a redirector, and links opened from mobile
 * apps usually drop the referrer entirely — so exactly the traffic you most want to
 * measure is the traffic the referrer cannot see. A tag you control is the reliable
 * signal; anything untagged is reported as "direct" rather than guessed at.
 *
 * **Web only.** An app installed from the App Store or Play Store launches with no URL,
 * so there is nothing to read. Those players report no source, and the stores' own
 * acquisition reports cover that side.
 */

const SOURCE_PARAM = 'ref';
const MAX_LENGTH = 64;

/** Mirrors the server-side sanitizer so a tag never fragments into near-duplicates. */
function sanitize(raw: string): string | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, MAX_LENGTH);

  return cleaned === '' ? null : cleaned;
}

function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    // Accessing localStorage throws in some privacy modes
    return false;
  }
}

/**
 * Returns the player's stored acquisition source, capturing it from the URL on first sight.
 *
 * First-touch: once a value is stored it is never overwritten, so a player who arrives via
 * Reddit and returns later through a different link stays credited to Reddit. A player who
 * first arrives untagged stays unattributed until they happen to arrive through a tagged
 * link — recording the first source we actually learn beats recording none at all.
 *
 * @param keyPrefix localStorage prefix, matching the one PlayerIdentity uses.
 * @returns the stored source, or null when none is known.
 */
export function captureSource(keyPrefix: string): string | null {
  if (!hasStorage()) return null;

  const storageKey = `${keyPrefix}source`;

  try {
    // Always go through window.localStorage, matching the hasStorage() guard, so both
    // refer to the same object.
    const store = window.localStorage;

    const existing = store.getItem(storageKey);
    if (existing) return existing;

    const params = new URLSearchParams(window.location.search);
    const incoming = params.get(SOURCE_PARAM);
    if (!incoming) return null;

    const sanitized = sanitize(incoming);
    if (!sanitized) return null;

    store.setItem(storageKey, sanitized);
    return sanitized;
  } catch {
    // Storage full, blocked, or location unavailable — analytics must never break the game
    return null;
  }
}

/** Clears the stored source. Intended for tests and debugging. */
export function clearSource(keyPrefix: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(`${keyPrefix}source`);
  } catch {
    // ignore
  }
}
