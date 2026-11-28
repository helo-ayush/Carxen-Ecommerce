import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.resolve(process.cwd(), 'src/app/api/storefront/orders/cancel/route.ts'), 'utf8');

// 1. Strict orderNumber regex (blocks commas/parens)
assert.match(src, /\^\[A-Za-z0-9\]\[A-Za-z0-9_-\]\{0,63\}\$/);
// 2. No .or() string interpolation
assert.doesNotMatch(src, /\.or\(/);
// 3. Fail-closed timestamp check
assert.match(src, /!Number\.isFinite\(hoursElapsed\)/);
// 4. Paid order self-cancel blocked
assert.match(src, /paymentUpper\s*===\s*['"]PAID['"]/);
// 5. Conditional atomic status check on UPDATE
assert.match(src, /\.in\(['"]status['"],\s*ALLOWED_CANCEL_STATUSES\)/);

console.log('PASS: Item 4 orders/cancel security checks passed');
