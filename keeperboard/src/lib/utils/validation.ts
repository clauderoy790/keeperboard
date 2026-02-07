/**
 * Input validation utilities for API routes.
 * Provides type checking and sanitization to prevent injection attacks.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate string input with length limits
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number; required?: boolean } = {}
): string {
  const { minLength = 0, maxLength = 1000, required = true } = options;

  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ValidationError(`${fieldName} is required`);
    }
    return '';
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  if (value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`
    );
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${maxLength} characters`
    );
  }

  return value;
}

/**
 * Validate number input with range limits
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean } = {}
): number {
  const { min = -Infinity, max = Infinity, required = true } = options;

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`);
    }
    return 0;
  }

  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  if (isNaN(num) || !isFinite(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  if (num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }

  if (num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }

  return num;
}

/**
 * Validate slug format (lowercase, hyphens, no special chars)
 */
export function validateSlug(value: string, fieldName: string): string {
  const slug = validateString(value, fieldName, { minLength: 1, maxLength: 100 });

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new ValidationError(
      `${fieldName} must only contain lowercase letters, numbers, and hyphens`
    );
  }

  if (slug.startsWith('-') || slug.endsWith('-')) {
    throw new ValidationError(`${fieldName} cannot start or end with a hyphen`);
  }

  return slug;
}

/**
 * Validate UUID format
 */
export function validateUUID(value: unknown, fieldName: string): string {
  const str = validateString(value, fieldName);

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(str)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }

  return str;
}

/**
 * Validate email format
 */
export function validateEmail(value: string, fieldName: string): string {
  const email = validateString(value, fieldName, { maxLength: 255 });

  // Simple email regex - not RFC compliant but good enough for validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError(`${fieldName} must be a valid email address`);
  }

  return email;
}

/**
 * Sanitize object metadata (prevent prototype pollution)
 */
export function sanitizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  if (Array.isArray(metadata)) {
    throw new ValidationError('Metadata must be an object, not an array');
  }

  // Create a clean object without prototype
  const clean = Object.create(null);

  for (const [key, value] of Object.entries(metadata)) {
    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    // Limit key length
    if (key.length > 100) {
      throw new ValidationError('Metadata keys must be at most 100 characters');
    }

    // Only allow primitive values (no nested objects)
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      clean[key] = value;
    }
  }

  return clean;
}
