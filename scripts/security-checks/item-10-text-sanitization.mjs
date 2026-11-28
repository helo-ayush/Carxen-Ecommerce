import assert from 'node:assert/strict';
import { sanitizeOrderFreeText } from '../../src/lib/server/validation.ts';

const xss = '<img src=x onerror=alert(1)> `hello`\n\t';
const cleaned = sanitizeOrderFreeText(xss, 300);

assert.equal(cleaned.includes('<'), false, 'Must strip <');
assert.equal(cleaned.includes('>'), false, 'Must strip >');
assert.equal(cleaned.includes('`'), false, 'Must strip backticks');
assert.equal(cleaned, 'img src=x onerror=alert(1) hello');

// Enforces maxLength
assert.equal(sanitizeOrderFreeText('a'.repeat(500), 100).length, 100);

console.log('PASS: Item 10 order free-text sanitization checks passed');
