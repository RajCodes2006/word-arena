import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBasicSubmissions } from '../src/services/validationService.js';

test('basic fallback validates letter-matching answers without Gemini', () => {
  const submissions = new Map([
    ['p1', {
      name: 'Aman',
      place: 'Agra',
      animal: 'Ant',
      thing: 'Apple'
    }],
    ['p2', {
      name: 'Bob',
      place: 'Delhi',
      animal: 'Cat',
      thing: 'Book'
    }]
  ]);

  const checks = validateBasicSubmissions({
    letter: 'A',
    submissions
  });

  assert.equal(checks.get('p1').name.valid, true);
  assert.equal(checks.get('p1').place.valid, true);
  assert.equal(checks.get('p1').animal.valid, true);
  assert.equal(checks.get('p1').thing.valid, true);

  assert.equal(checks.get('p2').name.valid, false);
  assert.equal(checks.get('p2').name.reason, 'WRONG_LETTER');
  assert.equal(checks.get('p2').place.valid, false);
  assert.equal(checks.get('p2').animal.valid, false);
  assert.equal(checks.get('p2').thing.valid, false);
});

test('basic fallback rejects empty answers', () => {
  const checks = validateBasicSubmissions({
    letter: 'A',
    submissions: new Map([
      ['p1', { name: '', place: 'Agra', animal: '', thing: '  ' }]
    ])
  });

  assert.equal(checks.get('p1').name.reason, 'EMPTY');
  assert.equal(checks.get('p1').animal.reason, 'EMPTY');
  assert.equal(checks.get('p1').thing.reason, 'EMPTY');
});
