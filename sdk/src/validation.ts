/**
 * Pure-function name validation with configurable rules.
 * Returns the sanitized name or null if invalid after sanitization.
 */

import type { NameValidationOptions } from './types';

const DEFAULTS: Required<NameValidationOptions> = {
  minLength: 2,
  maxLength: 12,
  allowedPattern: /[^A-Za-z0-9_]/g,
};

/**
 * Validate and sanitize a player name.
 *
 * 1. Trims whitespace
 * 2. Strips characters not matching `allowedPattern`
 * 3. Truncates to `maxLength`
 * 4. Returns `null` if result is shorter than `minLength`
 *
 * @example
 * validateName('  Ace Pilot! ')  // 'AcePilot'
 * validateName('ab')             // 'ab'
 * validateName('x')              // null (too short)
 */
export function validateName(
  input: string,
  options?: NameValidationOptions
): string | null {
  const opts = { ...DEFAULTS, ...options };

  let name = input.trim();
  const pattern = options?.allowedPattern ?? /[^A-Za-z0-9_]/g;

  name = name.replace(pattern, '');
  name = name.substring(0, opts.maxLength);

  if (name.length < opts.minLength) {
    return null;
  }

  return name;
}
