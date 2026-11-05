import crypto from 'crypto';

const SESSION_SECRET =
  process.env.JWT_SECRET ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXTAUTH_SECRET ||
  'carxen-prod-session-hmac-secret-key-salt-9812';

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
    .createHmac('sha256', SESSION_SECRET)
    .update(`cxs.${payloadB64}`)
    .digest('base64url');

  return `cxs.${payloadB64}.${signature}`;
}

/**
 * Verifies a session token using HMAC-SHA256 constant-time comparison and checks expiration.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.startsWith('cxs.')) {
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

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`cxs.${payloadB64}`)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );
    const now = Math.floor(Date.now() / 1000);

    if (!payload.sub || typeof payload.sub !== 'string') {
      return null;
    }

    if (!payload.exp || typeof payload.exp !== 'number' || payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
