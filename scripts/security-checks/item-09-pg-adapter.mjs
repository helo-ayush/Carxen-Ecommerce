import assert from 'node:assert/strict';
import {
  assertSafeIdent,
  escapeLikePattern,
  parseOrClauses,
  resolveSafeColumnExpr,
  splitOrClausesSafe,
} from '../../src/lib/server/pg-filter-utils.ts';

// 1. Wildcards %, _, \ are escaped for exact-match paths
assert.equal(escapeLikePattern('100%_test\\x'), '100\\%\\_test\\\\x');

// 2. Identifier validation blocks injection
assert.throws(() => assertSafeIdent('users; DROP TABLE x;--'), /Unsafe SQL/);
assert.throws(() => resolveSafeColumnExpr('col->>bad"key'), /Unsafe SQL/);

// 3. .or() throws on unsupported operators, empty filters, or unbalanced parens
assert.throws(() => parseOrClauses('status.gt.5'), /Unsupported/);
assert.throws(() => parseOrClauses(''), /Empty/);
assert.throws(() => splitOrClausesSafe('a.eq.(1,2'), /Malformed/);

// 4. Quoted values containing commas stay together and .ilike. does not infer wildcards
const parts = splitOrClausesSafe('name.eq."a,b",status.eq.ACTIVE');
assert.deepEqual(parts, ['name.eq."a,b"', 'status.eq.ACTIVE']);
const parsed = parseOrClauses('email.ilike.a%b@example.com');
assert.equal(parsed.sqlParts[0], 'LOWER(COALESCE("email", \'\')) = LOWER($PARAM)');
assert.deepEqual(parsed.values, ['a%b@example.com']);

console.log('PASS: Item 9 pg-supabase-adapter filter parsing checks passed');
