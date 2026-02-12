/**
 * Pure-function name validation with configurable rules.
 * Returns the sanitized name or null if invalid after sanitization.
 */

import type { NameValidationOptions } from './types';

const DEFAULTS: Required<NameValidationOptions> = {
  minLength: 2,
  maxLength: 12,
  uppercase: true,
  allowedPattern: /[^A-Z0-9_]/g,
};

/**
 * Validate and sanitize a player name.
 *
 * 1. Trims whitespace
 * 2. Optionally converts to uppercase (default: yes)
 * 3. Strips characters not matching `allowedPattern`
 * 4. Truncates to `maxLength`
 * 5. Returns `null` if result is shorter than `minLength`
 *
 * @example
 * validateName('  Ace Pilot! ')  // 'ACE_PILOT' → wait, no spaces allowed → 'ACEPILOT'
 * validateName('ab')             // 'AB'
 * validateName('x')              // null (too short)
 */
export function validateName(
  input: string,
  options?: NameValidationOptions
): string | null {
  const opts = { ...DEFAULTS, ...options };

  let name = input.trim();

  if (opts.uppercase) {
    name = name.toUpperCase();
  }

  // Use case-appropriate pattern if no custom pattern was provided
  const pattern = options?.allowedPattern ?? (opts.uppercase
    ? /[^A-Z0-9_]/g
    : /[^A-Za-z0-9_]/g);

  name = name.replace(pattern, '');
  name = name.substring(0, opts.maxLength);

  if (name.length < opts.minLength) {
    return null;
  }

  return name;
}
