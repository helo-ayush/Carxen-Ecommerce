import crypto from 'crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TOKEN_LIFETIME_SECONDS = 31 * 24 * 60 * 60; // 31 days

export function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET;

  if (secret && secret.trim().length > 0) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL: No session signing secret configured (set SESSION_SECRET or JWT_SECRET).'
    );
  }

  return 'carxen-dev-only-session-secret-do-not-use-in-prod';
}

export interface SessionPayload {
  sub: string; // Auth User ID (UUID)
  email: string;
  iat: number;
  exp: number;
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 * Format: cxs.<base64url(payload)>.<base64url(hmac_signature)>
 */
export function signSessionToken(
  userId: string,
  email: string,
  expiresInSeconds: number = 30 * 24 * 60 * 60
): string {
  const payload: SessionPayload = {
    sub: userId,
    email: email ? email.trim().toLowerCase() : '',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`cxs.${payloadB64}`)
    .digest('base64url');

  return `cxs.${payloadB64}.${signature}`;
}

/**
 * Verifies a session token using HMAC-SHA256 constant-time comparison and checks expiration.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.startsWith('cxs.') || token.length > 4096) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [, payloadB64, signature] = parts;
  if (!payloadB64 || !signature) {
    return null;
  }

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(`cxs.${payloadB64}`)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSig, 'utf8');

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );
    const now = Math.floor(Date.now() / 1000);

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if (!payload.sub || typeof payload.sub !== 'string' || !UUID_REGEX.test(payload.sub)) {
      return null;
    }

    if (
      typeof payload.iat !== 'number' ||
      !Number.isFinite(payload.iat) ||
      payload.iat > now + 60
    ) {
      return null;
    }

    if (
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= now ||
      payload.exp - payload.iat <= 0 ||
      payload.exp - payload.iat > MAX_TOKEN_LIFETIME_SECONDS
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

