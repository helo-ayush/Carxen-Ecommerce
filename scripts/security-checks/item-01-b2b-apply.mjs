import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const routePath = path.resolve(process.cwd(), 'src/app/api/storefront/b2b/apply/route.ts');
const src = fs.readFileSync(routePath, 'utf8');

// 1. Must block APPROVED dealers from downgrading/re-applying
assert.match(src, /b2bStatus\s*===\s*['"]APPROVED['"][\s\S]{0,160}status:\s*409/, 'Expected 409 guard for APPROVED dealers');

// 2. Must not look up ecommerce_customers by body.email / normalizedEmail
assert.doesNotMatch(src, /\.eq\(['"]email['"],\s*normalizedEmail\)/, 'Must not look up customer row by body.email');

// 3. Must store applicant email in metadata.b2bContactEmail rather than overwriting ecommerce_customers.email
assert.match(src, /b2bContactEmail:\s*contactEmail/, 'Expected b2bContactEmail in metadata');
assert.doesNotMatch(src, /b2bData\s*=\s*\{[\s\S]{0,200}\bemail:/, 'b2bData must not overwrite ecommerce_customers.email');

console.log('PASS: Item 1 b2b/apply static security assertions passed');
