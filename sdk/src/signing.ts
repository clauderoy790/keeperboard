/**
 * Multi-step HMAC signature generation for anti-cheat.
 * Designed to be tedious to reverse-engineer from browser DevTools.
 *
 * Algorithm:
 * 1. Derive key from secret + player GUID prefix
 * 2. Build payload with transformed values (reversed, XORed)
 * 3. HMAC the payload
 * 4. XOR result with timestamp bytes
 * 5. URL-safe base64 encode
 */

export interface SigningParams {
  playerGuid: string;
  timestamp: number;
  score?: number;
  runId?: string;
}

/**
 * Generate a multi-step signature for a request.
 * Uses Web Crypto API for browser compatibility.
 */
export async function signRequest(
  params: SigningParams,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();

  // Step 1: Derive key from secret + player GUID prefix
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const derivedKeyData = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    encoder.encode(params.playerGuid.slice(0, 8))
  );

  const derivedKey = await crypto.subtle.importKey(
    'raw',
    derivedKeyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Step 2: Build payload with weird transformations
  const parts: string[] = [params.playerGuid];

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
  const hmacResult = await crypto.subtle.sign(
    'HMAC',
    derivedKey,
    encoder.encode(payload)
  );

  const hmacHex = Array.from(new Uint8Array(hmacResult))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Step 4: XOR with timestamp string
  const tsStr = String(params.timestamp);
  const xored = hmacHex
    .split('')
    .map((c, i) => {
      const tsChar = tsStr[i % tsStr.length];
      return String.fromCharCode(c.charCodeAt(0) ^ tsChar.charCodeAt(0));
    })
    .join('');

  // Step 5: URL-safe base64 (no padding)
  const signature = btoa(xored)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return signature;
}
