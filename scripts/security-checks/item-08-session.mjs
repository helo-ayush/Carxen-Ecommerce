import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { signSessionToken, verifySessionToken, getSessionSecret } from '../../src/lib/server/session.ts';

const validUuid = '11111111-2222-4333-8444-555555555555';
const good = signSessionToken(validUuid, 'user@example.com');
assert.equal(verifySessionToken(good)?.sub, validUuid);

// 1. Tampered signature
const parts = good.split('.');
assert.equal(verifySessionToken(`${parts[0]}.${parts[1]}.tampered`), null);

// 2. Truncated / malformed
assert.equal(verifySessionToken('cxs.abc'), null);
assert.equal(verifySessionToken('not-a-token'), null);
assert.equal(verifySessionToken('user@example.com'), null);
assert.equal(verifySessionToken(validUuid), null);

// 3. Expired
const expired = signSessionToken(validUuid, 'user@example.com', -10);
assert.equal(verifySessionToken(expired), null);

// 4. Non-UUID sub (signed with valid secret)
const nonUuid = signSessionToken('not-a-uuid', 'user@example.com');
assert.equal(verifySessionToken(nonUuid), null);

// 5. Future iat or excessive lifetime (> 31 days)
function forgeRaw(payload) {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(`cxs.${b64}`).digest('base64url');
  return `cxs.${b64}.${sig}`;
}
const now = Math.floor(Date.now() / 1000);
assert.equal(verifySessionToken(forgeRaw({ sub: validUuid, email: 'a@b.com', iat: now + 3600, exp: now + 7200 })), null);
assert.equal(verifySessionToken(forgeRaw({ sub: validUuid, email: 'a@b.com', iat: now, exp: now + 60 * 24 * 60 * 60 })), null);

console.log('PASS: Item 8 session token hardening checks passed');
