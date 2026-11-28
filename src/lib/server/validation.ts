const STRICT_EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
const FORBIDDEN_EMAIL_CHARS = /[%*_\s'"`,()<>\\]/;

/**
 * Normalizes and strictly validates an email address.
 * Rejects wildcard/filter-metacharacters (%, *, _), whitespace, quotes, commas, and parentheses.
 * Returns the normalized lowercase email, or null if invalid.
 */
export function normalizeStrictEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  if (!normalized || normalized.length > 254) return null;
  if (FORBIDDEN_EMAIL_CHARS.test(normalized)) return null;
  if (!STRICT_EMAIL_REGEX.test(normalized)) return null;
  return normalized;
}

export function isValidStrictEmail(raw: unknown): boolean {
  return normalizeStrictEmail(raw) !== null;
}
