import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoundResults,
  normalizeAnswer,
  pickRandomLetter
} from '../src/services/gameService.js';

test('normalizeAnswer trims and collapses whitespace', () => {
  assert.equal(normalizeAnswer('  New   Delhi  '), 'New Delhi');
});

test('cross-category identical answers are not duplicates', () => {
  const players = [
    { playerId: 'p1', displayName: 'One', score: 0 },
    { playerId: 'p2', displayName: 'Two', score: 0 }
  ];
  const submissions = new Map([
    ['p1', { name: 'Paris', place: '' }],
    ['p2', { name: '', place: 'Paris' }]
  ]);
  const validations = new Map([
    ['p1', { name: { valid: true, reason: 'ok' }, place: { valid: false } }],
    ['p2', { name: { valid: false }, place: { valid: true, reason: 'ok' } }]
  ]);

  const results = calculateRoundResults({ players, submissions, validations });
  assert.deepEqual(
    results.map((r) => r.roundScore).sort((a, b) => a - b),
    [10, 10]
  );
});

test('same-category identical answers score as duplicates', () => {
  const players = [
    { playerId: 'p1', displayName: 'One', score: 0 },
    { playerId: 'p2', displayName: 'Two', score: 0 }
  ];
  const submissions = new Map([
    ['p1', { name: 'Aman' }],
    ['p2', { name: 'Aman' }]
  ]);
  const validations = new Map([
    ['p1', { name: { valid: true, reason: 'ok' } }],
    ['p2', { name: { valid: true, reason: 'ok' } }]
  ]);

  const results = calculateRoundResults({ players, submissions, validations });
  assert.equal(results[0].roundScore, 5);
  assert.equal(results[1].roundScore, 5);
  assert.equal(results[0].breakdown.name.duplicate, true);
});

test('invalid answers score zero', () => {
  const players = [{ playerId: 'p1', displayName: 'One', score: 20 }];
  const submissions = new Map([
    ['p1', { name: '!!!' }]
  ]);
  const validations = new Map([
    ['p1', { name: { valid: false, reason: 'invalid' } }]
  ]);

  const results = calculateRoundResults({ players, submissions, validations });
  assert.equal(results[0].roundScore, 0);
  assert.equal(results[0].totalScore, 20);
});

test('random letter picker avoids used letters while available letters remain', () => {
  const used = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXY');
  const letter = pickRandomLetter(used);
  assert.equal(letter, 'Z');
});
