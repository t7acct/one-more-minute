import test from 'node:test';
import assert from 'node:assert/strict';
import { readWalk, walkHash } from '../walk-state.js';

const places = new Set(['ucl', 'euston', 'russell', 'goodge']);
test('shared links round-trip both budgets and destinations', () => {
  const state = { start: 'goodge', a: 'russell', b: 'euston', extra: 0, extraB: 8 };
  assert.deepEqual(readWalk(walkHash(state), places), state);
});
test('old links keep the same allowance for both people', () => {
  const state = readWalk('#start=ucl&a=euston&b=russell&extra=3', places);
  assert.equal(state.extra, 3); assert.equal(state.extraB, 3);
});
test('broken links fall back to valid choices', () => {
  const state = readWalk('#start=somewhere&extra=-10&extraB=Infinity&a=%3Cscript%3E', places);
  assert.deepEqual(state, { start: 'ucl', a: 'euston', b: 'russell', extra: 5, extraB: 5 });
  assert.equal(readWalk('#extra=&extraB=1.5', places).extra, 5);
  assert.equal(readWalk('#extra=0&extraB=0', places).extraB, 0);
});
