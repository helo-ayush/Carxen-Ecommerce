import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeStrictEmail } from '../../src/lib/server/validation.ts';

// 1. Strict email validation
assert.equal(normalizeStrictEmail('  Alice@Example.COM  '), 'alice@example.com');
assert.equal(normalizeStrictEmail('bad%user@example.com'), null, 'Must reject %');
assert.equal(normalizeStrictEmail('bad_user@example.com'), null, 'Must reject _');
assert.equal(normalizeStrictEmail('bad*user@example.com'), null, 'Must reject *');
assert.equal(normalizeStrictEmail('bad user@example.com'), null, 'Must reject whitespace');
assert.equal(normalizeStrictEmail('bad,user@example.com'), null, 'Must reject comma');
assert.equal(normalizeStrictEmail('bad(user)@example.com'), null, 'Must reject parens');
assert.equal(normalizeStrictEmail('bad"user@example.com'), null, 'Must reject quotes');

// 2. customer.ts must not link by email or load orders by customerSnapshot->>email
const customerSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/server/customer.ts'), 'utf8');
assert.doesNotMatch(customerSrc, /customerSnapshot->>email/, 'loadCustomerOrders must not query by customerSnapshot->>email');
assert.doesNotMatch(customerSrc, /email\.ilike\./, 'customer.ts must not look up customer rows by ilike email');

// 3. auth/callback/route.ts must look up strictly by authUserId
const callbackSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/app/auth/callback/route.ts'), 'utf8');
assert.doesNotMatch(callbackSrc, /email\.eq\./, 'OAuth callback must not link existing customer row by email');

console.log('PASS: Item 2 signup, account linking, and order lookup checks passed');
