import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const envEx = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
assert.match(envEx, /^SESSION_SECRET=/m, '.env.example must document SESSION_SECRET');

const instr = fs.readFileSync(path.resolve(process.cwd(), 'src/instrumentation.ts'), 'utf8');
assert.match(instr, /getSessionSecret\(\)/, 'instrumentation.ts must validate session secret at startup');

console.log('PASS: Item 11 housekeeping checks passed');
